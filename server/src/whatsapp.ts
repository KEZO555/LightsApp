import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  getContentType,
  downloadMediaMessage,
  jidNormalizedUser,
  isJidGroup,
  type WASocket,
  type WAMessage,
  type proto,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { EventEmitter } from "events";
import type {
  ChatInfo,
  MessageInfo,
  ContactInfo,
  PresenceInfo,
  ConnectionStatus,
  QuotedMessage,
  MessageType,
  MessageStatus,
} from "./types.js";

const AUTH_DIR = join(process.cwd(), "auth_state");
const MEDIA_DIR = join(process.cwd(), "media");
for (const dir of [AUTH_DIR, MEDIA_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export const MEDIA_PATH = MEDIA_DIR;

const logger = pino({ level: "silent" });

const STATUS_MAP: Record<number, MessageStatus> = {
  0: "pending",
  1: "pending",
  2: "sent",
  3: "delivered",
  4: "read",
};

const rawKey = (chatId: string, id: string) => `${chatId}|${id}`;

/** Coerce Baileys numeric fields (number | Long | null) to a plain number. */
const toNum = (v: unknown): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && typeof (v as any).toNumber === "function") {
    return (v as any).toNumber();
  }
  return Number(v) || 0;
};

/**
 * Wraps a Baileys connection and keeps an in-memory store of chats, contacts
 * and messages. The store is what makes chat history work: messages are kept
 * as they arrive (live + initial history sync) and served on demand, instead
 * of relying on a `fetchMessages` socket method that does not exist.
 */
export class WhatsAppClient extends EventEmitter {
  private sock: WASocket | null = null;
  private status: ConnectionStatus = { state: "disconnected" };

  private contacts = new Map<string, ContactInfo>();
  private chats = new Map<string, ChatInfo>();
  private messages = new Map<string, MessageInfo[]>();
  /** Raw protocol messages, needed to download media lazily. */
  private rawMessages = new Map<string, WAMessage>();

  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  // ---- public accessors -------------------------------------------------

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getChats(): ChatInfo[] {
    return Array.from(this.chats.values())
      .filter((c) => c.lastMessage || c.unreadCount > 0)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getContacts(): ContactInfo[] {
    return Array.from(this.contacts.values())
      .filter((c) => !c.isGroup)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getStoredMessages(chatId: string): MessageInfo[] {
    return this.messages.get(chatId) ?? [];
  }

  getRawMessage(chatId: string, id: string): WAMessage | undefined {
    return this.rawMessages.get(rawKey(chatId, id));
  }

  // ---- naming helpers ---------------------------------------------------

  private contactName(jid: string): string {
    const c = this.contacts.get(jid);
    return c?.name || c?.notify || jid.split("@")[0];
  }

  // ---- connection -------------------------------------------------------

  async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    this.setStatus({ state: "connecting" });

    this.sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    this.sock.ev.on("creds.update", saveCreds);
    this.registerHandlers();
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.emit("connection:update", status);
  }

  private registerHandlers() {
    const sock = this.sock!;

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.setStatus({ state: "qr", qr });
        console.log("[WA] QR code ready for scan");
      }

      if (connection === "close") {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        this.setStatus({ state: "disconnected" });

        if (!loggedOut && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = 3000 * this.reconnectAttempts;
          console.log(`[WA] Reconnecting in ${delay}ms (#${this.reconnectAttempts})`);
          setTimeout(() => this.connect().catch(console.error), delay);
        } else if (loggedOut) {
          console.log("[WA] Logged out. Delete auth_state/ to re-pair.");
        }
      }

      if (connection === "open") {
        this.reconnectAttempts = 0;
        const user = sock.user;
        this.setStatus({
          state: "connected",
          user: user ? { id: user.id, name: user.name || "" } : undefined,
        });
        console.log(`[WA] Connected as ${user?.name || user?.id}`);
      }
    });

    // ---- contacts ----
    const upsertContacts = (list: { id?: string | null; name?: string | null; notify?: string | null }[]) => {
      const out: ContactInfo[] = [];
      for (const c of list) {
        if (!c.id) continue;
        const info: ContactInfo = {
          id: c.id,
          name: c.name || c.notify || c.id.split("@")[0],
          notify: c.notify || undefined,
          isGroup: isJidGroup(c.id) ?? false,
        };
        this.contacts.set(c.id, info);
        out.push(info);
      }
      if (out.length) this.emit("contacts:upsert", out);
    };

    sock.ev.on("contacts.upsert", upsertContacts);
    sock.ev.on("contacts.update", (updates) => {
      for (const u of updates) {
        if (!u.id) continue;
        const existing = this.contacts.get(u.id);
        if (existing && (u.notify || u.name)) {
          existing.name = u.name || u.notify || existing.name;
          if (u.notify) existing.notify = u.notify;
        }
      }
    });

    // ---- history sync (initial + on-demand) ----
    sock.ev.on("messaging-history.set", ({ chats, contacts, messages }) => {
      upsertContacts(contacts);
      for (const chat of chats) this.upsertChatMeta(chat);
      for (const msg of messages) this.ingestMessage(msg, false);
      this.emit("chats:upsert", this.getChats());
      console.log(
        `[WA] History sync: ${chats.length} chats, ${messages.length} messages`,
      );
    });

    // ---- chats ----
    sock.ev.on("chats.upsert", (chats) => {
      for (const chat of chats) this.upsertChatMeta(chat);
      this.emit("chats:upsert", this.getChats());
    });
    sock.ev.on("chats.update", (updates) => {
      for (const u of updates) {
        const existing = this.chats.get(u.id!);
        if (!existing) continue;
        if (u.unreadCount != null) existing.unreadCount = u.unreadCount;
        if (u.conversationTimestamp) existing.timestamp = toNum(u.conversationTimestamp);
        if (u.archived != null) existing.archived = u.archived;
        if (u.muteEndTime != null) existing.muted = toNum(u.muteEndTime) > 0;
        existing.name = this.contactName(existing.id);
      }
      this.emit("chats:upsert", this.getChats());
    });
    sock.ev.on("chats.delete", (ids) => {
      for (const id of ids) {
        this.chats.delete(id);
        this.messages.delete(id);
      }
      this.emit("chats:delete", ids);
    });

    // ---- messages ----
    sock.ev.on("messages.upsert", ({ messages, type }) => {
      const fresh: MessageInfo[] = [];
      for (const msg of messages) {
        const info = this.ingestMessage(msg, type === "notify");
        if (info) fresh.push(info);
      }
      if (fresh.length) {
        this.emit("messages:upsert", fresh);
        this.emit("chats:upsert", this.getChats());
      }
    });

    sock.ev.on("messages.update", (updates) => {
      const statusUpdates: { id: string; chatId: string; status: MessageStatus }[] = [];
      for (const u of updates) {
        const remoteJid = u.key.remoteJid;
        const id = u.key.id;
        if (!remoteJid || !id || u.update.status == null) continue;
        const status = STATUS_MAP[u.update.status] || "sent";
        const stored = this.messages.get(remoteJid)?.find((m) => m.id === id);
        if (stored) stored.status = status;
        statusUpdates.push({ id, chatId: remoteJid, status });
      }
      if (statusUpdates.length) this.emit("messages:status", statusUpdates);
    });

    // ---- presence ----
    sock.ev.on("presence.update", ({ id, presences }) => {
      for (const [participant, info] of Object.entries(presences)) {
        const update: PresenceInfo = {
          chatId: id,
          participant: isJidGroup(id) ? participant : undefined,
          status: (info.lastKnownPresence as PresenceInfo["status"]) || "unavailable",
          lastSeen: info.lastSeen || undefined,
        };
        this.emit("presence:update", update);
      }
    });

    // ---- groups ----
    sock.ev.on("groups.upsert", (groups) => {
      for (const g of groups) {
        this.contacts.set(g.id, { id: g.id, name: g.subject, isGroup: true });
        const chat = this.chats.get(g.id);
        if (chat) {
          chat.name = g.subject;
          chat.participantCount = g.participants.length;
        }
      }
      this.emit("chats:upsert", this.getChats());
    });
    sock.ev.on("groups.update", (updates) => {
      for (const u of updates) {
        if (!u.id || !u.subject) continue;
        const chat = this.chats.get(u.id);
        if (chat) chat.name = u.subject;
        const contact = this.contacts.get(u.id);
        if (contact) contact.name = u.subject;
      }
      this.emit("chats:upsert", this.getChats());
    });
  }

  // ---- store helpers ----------------------------------------------------

  private upsertChatMeta(chat: {
    id: string;
    unreadCount?: number | null;
    conversationTimestamp?: unknown;
    archived?: boolean | null;
    muteEndTime?: unknown;
  }) {
    const existing = this.chats.get(chat.id);
    const info: ChatInfo = {
      id: chat.id,
      name: this.contactName(chat.id),
      isGroup: isJidGroup(chat.id) ?? false,
      unreadCount: chat.unreadCount ?? existing?.unreadCount ?? 0,
      lastMessage: existing?.lastMessage ?? null,
      timestamp: chat.conversationTimestamp != null ? toNum(chat.conversationTimestamp) : existing?.timestamp ?? 0,
      muted: chat.muteEndTime != null ? toNum(chat.muteEndTime) > 0 : existing?.muted ?? false,
      archived: chat.archived ?? existing?.archived ?? false,
      participantCount: existing?.participantCount,
    };
    this.chats.set(chat.id, info);
  }

  /** Parse, store, and (optionally count toward unread) a raw message. */
  private ingestMessage(msg: WAMessage, live: boolean): MessageInfo | null {
    const info = this.parseMessage(msg);
    if (!info) return null;

    this.rawMessages.set(rawKey(info.chatId, info.id), msg);

    const list = this.messages.get(info.chatId) ?? [];
    const idx = list.findIndex((m) => m.id === info.id);
    if (idx >= 0) list[idx] = info;
    else list.push(info);
    list.sort((a, b) => a.timestamp - b.timestamp);
    // Cap per-chat history to keep memory bounded.
    if (list.length > 500) list.splice(0, list.length - 500);
    this.messages.set(info.chatId, list);

    let chat = this.chats.get(info.chatId);
    if (!chat) {
      chat = {
        id: info.chatId,
        name: this.contactName(info.chatId),
        isGroup: isJidGroup(info.chatId) ?? false,
        unreadCount: 0,
        lastMessage: null,
        timestamp: 0,
        muted: false,
        archived: false,
      };
      this.chats.set(info.chatId, chat);
    }
    // Only advance "last message" forward in time.
    if (info.timestamp >= chat.timestamp) {
      chat.lastMessage = info;
      chat.timestamp = info.timestamp;
    }
    chat.name = this.contactName(info.chatId);
    if (live && !info.fromMe) chat.unreadCount = (chat.unreadCount || 0) + 1;

    return info;
  }

  private parseMessage(msg: WAMessage): MessageInfo | null {
    if (!msg.message || msg.key.remoteJid === "status@broadcast") return null;
    const chatId = msg.key.remoteJid;
    if (!chatId || !msg.key.id) return null;

    const fromMe = msg.key.fromMe ?? false;
    const sender = fromMe
      ? jidNormalizedUser(this.sock?.user?.id || "")
      : msg.key.participant || chatId;

    const contentType = getContentType(msg.message);
    if (!contentType) return null;
    const content = msg.message[contentType as keyof typeof msg.message] as any;

    let type: MessageType = "unknown";
    let text: string | undefined;
    let caption: string | undefined;
    let mediaMimeType: string | undefined;
    let mediaDuration: number | undefined;
    let thumbnail: string | undefined;

    const thumbFrom = (c: any): string | undefined =>
      c?.jpegThumbnail
        ? `data:image/jpeg;base64,${Buffer.from(c.jpegThumbnail).toString("base64")}`
        : undefined;

    switch (contentType) {
      case "conversation":
        type = "text";
        text = msg.message.conversation || undefined;
        break;
      case "extendedTextMessage":
        type = "text";
        text = content?.text || undefined;
        break;
      case "imageMessage":
        type = "image";
        caption = content?.caption || undefined;
        mediaMimeType = content?.mimetype;
        thumbnail = thumbFrom(content);
        break;
      case "videoMessage":
        type = "video";
        caption = content?.caption || undefined;
        mediaMimeType = content?.mimetype;
        mediaDuration = content?.seconds || undefined;
        thumbnail = thumbFrom(content);
        break;
      case "audioMessage":
        type = content?.ptt ? "voice" : "audio";
        mediaMimeType = content?.mimetype;
        mediaDuration = content?.seconds || undefined;
        break;
      case "documentMessage":
        type = "document";
        caption = content?.fileName || undefined;
        mediaMimeType = content?.mimetype;
        break;
      case "stickerMessage":
        type = "sticker";
        mediaMimeType = content?.mimetype;
        break;
      case "locationMessage":
        type = "location";
        text =
          content?.degreesLatitude != null
            ? `${content.degreesLatitude}, ${content.degreesLongitude}`
            : undefined;
        break;
      default:
        type = "unknown";
    }

    const isMedia = ["image", "video", "audio", "voice", "document", "sticker"].includes(type);
    const mediaUrl = isMedia ? `/media/${encodeURIComponent(chatId)}/${msg.key.id}` : undefined;

    let quotedMessage: QuotedMessage | undefined;
    const ctx = content?.contextInfo as proto.IContextInfo | undefined;
    if (ctx?.quotedMessage) {
      const qType = getContentType(ctx.quotedMessage);
      const qText =
        qType === "conversation"
          ? ctx.quotedMessage.conversation
          : qType === "extendedTextMessage"
            ? ctx.quotedMessage.extendedTextMessage?.text
            : undefined;
      quotedMessage = {
        id: ctx.stanzaId || "",
        text: qText || undefined,
        senderName: this.contactName(ctx.participant || chatId),
        type:
          qType === "imageMessage"
            ? "image"
            : qType === "audioMessage"
              ? "voice"
              : qType === "videoMessage"
                ? "video"
                : "text",
      };
    }

    return {
      id: msg.key.id,
      chatId,
      fromMe,
      sender,
      senderName: this.contactName(sender),
      timestamp: toNum(msg.messageTimestamp) || Math.floor(Date.now() / 1000),
      type,
      text,
      caption,
      mediaUrl,
      mediaMimeType: mediaMimeType || undefined,
      mediaDuration,
      thumbnail,
      quotedMessage,
      isForwarded: (ctx?.isForwarded ?? false) || undefined,
      status: fromMe ? STATUS_MAP[msg.status ?? 0] : undefined,
      groupParticipant: isJidGroup(chatId) && !fromMe ? sender : undefined,
    };
  }

  // ---- actions ----------------------------------------------------------

  async sendText(chatId: string, text: string, quotedId?: string): Promise<MessageInfo | null> {
    if (!this.sock) return null;
    const quoted = quotedId ? this.getRawMessage(chatId, quotedId) : undefined;
    const sent = await this.sock.sendMessage(chatId, { text }, quoted ? { quoted } : {});
    return sent ? this.ingestMessage(sent, false) : null;
  }

  async sendImage(chatId: string, buffer: Buffer, caption?: string, mimetype?: string): Promise<MessageInfo | null> {
    if (!this.sock) return null;
    const sent = await this.sock.sendMessage(chatId, {
      image: buffer,
      caption: caption || undefined,
      mimetype: mimetype || "image/jpeg",
    });
    return sent ? this.ingestMessage(sent, false) : null;
  }

  async sendVoice(chatId: string, buffer: Buffer): Promise<MessageInfo | null> {
    if (!this.sock) return null;
    const sent = await this.sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    });
    return sent ? this.ingestMessage(sent, false) : null;
  }

  /** Returns stored messages for a chat. When `before` is given and we are at
   * the start of our cache, asks WhatsApp for older history (delivered async
   * via messaging-history.set). */
  async fetchMessages(chatId: string, before?: string): Promise<MessageInfo[]> {
    const list = this.messages.get(chatId) ?? [];
    if (before && list.length > 0) {
      const oldest = list[0];
      if (oldest.id === before && this.sock) {
        const raw = this.getRawMessage(chatId, oldest.id);
        if (raw) {
          this.sock
            .fetchMessageHistory(50, raw.key, toNum(raw.messageTimestamp))
            .catch((e) => console.error("[WA] fetchMessageHistory failed:", e));
        }
      }
      const idx = list.findIndex((m) => m.id === before);
      return idx > 0 ? list.slice(0, idx) : [];
    }
    return list;
  }

  async downloadMedia(chatId: string, id: string): Promise<Buffer | null> {
    const raw = this.getRawMessage(chatId, id);
    if (!raw || !this.sock) return null;
    try {
      const buffer = await downloadMediaMessage(raw, "buffer", {}, {
        logger,
        reuploadRequest: this.sock.updateMediaMessage,
      });
      return buffer as Buffer;
    } catch (e) {
      console.error("[WA] Media download failed:", e);
      return null;
    }
  }

  async markAsRead(chatId: string, ids: string[]): Promise<void> {
    if (!this.sock || ids.length === 0) return;
    try {
      const isGroup = isJidGroup(chatId);
      await this.sock.readMessages(
        ids.map((id) => {
          const raw = this.getRawMessage(chatId, id);
          return {
            remoteJid: chatId,
            id,
            participant: isGroup ? raw?.key.participant ?? undefined : undefined,
          };
        }),
      );
      const chat = this.chats.get(chatId);
      if (chat) {
        chat.unreadCount = 0;
        this.emit("chats:upsert", this.getChats());
      }
    } catch (e) {
      console.error("[WA] markAsRead failed:", e);
    }
  }

  async sendPresence(chatId: string, type: "composing" | "recording" | "paused"): Promise<void> {
    if (!this.sock) return;
    await this.sock.sendPresenceUpdate(type, chatId);
  }

  async subscribePresence(chatId: string): Promise<void> {
    if (!this.sock) return;
    await this.sock.presenceSubscribe(chatId).catch(() => {});
  }

  /** Resolve a phone number (digits only) to a WhatsApp JID, if registered. */
  async resolveNumber(number: string): Promise<{ jid: string; exists: boolean }> {
    const digits = number.replace(/[^0-9]/g, "");
    const jid = `${digits}@s.whatsapp.net`;
    if (!this.sock) return { jid, exists: false };
    try {
      const results = await this.sock.onWhatsApp(digits);
      const match = results?.[0];
      return { jid: match?.jid || jid, exists: !!match?.exists };
    } catch {
      return { jid, exists: false };
    }
  }

  async getProfilePicUrl(jid: string): Promise<string | undefined> {
    if (!this.sock) return undefined;
    try {
      return await this.sock.profilePictureUrl(jid, "image");
    } catch {
      return undefined;
    }
  }

  async logout(): Promise<void> {
    if (!this.sock) return;
    try {
      await this.sock.logout();
    } catch {
      /* ignore */
    }
    this.sock = null;
    this.contacts.clear();
    this.chats.clear();
    this.messages.clear();
    this.rawMessages.clear();
    this.setStatus({ state: "disconnected" });
  }
}

export const waClient = new WhatsAppClient();
