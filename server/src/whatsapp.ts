import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  BaileysEventMap,
  proto,
  getContentType,
  downloadMediaMessage,
  WAMessage,
  jidNormalizedUser,
  isJidGroup,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { join } from "path";
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "fs";
import { EventEmitter } from "events";
import type {
  ChatInfo,
  MessageInfo,
  ContactInfo,
  PresenceInfo,
  ConnectionStatus,
  QuotedMessage,
} from "./types.js";

const AUTH_DIR = join(process.cwd(), "auth_state");
const MEDIA_DIR = join(process.cwd(), "media");

if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });
if (!existsSync(MEDIA_DIR)) mkdirSync(MEDIA_DIR, { recursive: true });

const logger = pino({ level: "silent" });

export class WhatsAppClient extends EventEmitter {
  private sock: WASocket | null = null;
  private connectionStatus: ConnectionStatus = { state: "disconnected" };
  private contacts: Map<string, ContactInfo> = new Map();
  private chats: Map<string, ChatInfo> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  getChats(): ChatInfo[] {
    return Array.from(this.chats.values())
      .filter((c) => c.lastMessage || c.unreadCount > 0)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getContacts(): ContactInfo[] {
    return Array.from(this.contacts.values()).filter((c) => !c.isGroup);
  }

  getContact(jid: string): ContactInfo | undefined {
    return this.contacts.get(jid);
  }

  getSocket(): WASocket | null {
    return this.sock;
  }

  private getContactName(jid: string): string {
    const contact = this.contacts.get(jid);
    if (contact?.name) return contact.name;
    if (contact?.notify) return contact.notify;
    return jid.split("@")[0];
  }

  async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    this.connectionStatus = { state: "connecting" };
    this.emit("connection:update", this.connectionStatus);

    this.sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: true,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
    });

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.connectionStatus = { state: "qr", qr };
        this.emit("connection:update", this.connectionStatus);
        console.log("[WA] QR code generated");
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.connectionStatus = { state: "disconnected" };
        this.emit("connection:update", this.connectionStatus);

        if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[WA] Reconnecting (attempt ${this.reconnectAttempts})...`);
          setTimeout(() => this.connect(), 3000 * this.reconnectAttempts);
        } else if (!shouldReconnect) {
          console.log("[WA] Logged out. Clear auth_state to re-pair.");
        }
      }

      if (connection === "open") {
        this.reconnectAttempts = 0;
        const user = this.sock?.user;
        this.connectionStatus = {
          state: "connected",
          user: user ? { id: user.id, name: user.name || "" } : undefined,
        };
        this.emit("connection:update", this.connectionStatus);
        console.log(`[WA] Connected as ${user?.name || user?.id}`);
      }
    });

    this.sock.ev.on("contacts.upsert", (contacts) => {
      for (const contact of contacts) {
        const info: ContactInfo = {
          id: contact.id,
          name: contact.name || contact.notify || contact.id.split("@")[0],
          notify: contact.notify || undefined,
          isGroup: isJidGroup(contact.id),
        };
        this.contacts.set(contact.id, info);
      }
      this.emit("contacts:upsert", contacts.map((c) => ({
        id: c.id,
        name: c.name || c.notify || c.id.split("@")[0],
        notify: c.notify || undefined,
        isGroup: isJidGroup(c.id),
      })));
    });

    this.sock.ev.on("contacts.update", (updates) => {
      for (const update of updates) {
        const existing = this.contacts.get(update.id!);
        if (existing) {
          if (update.notify) existing.name = update.notify;
          this.contacts.set(update.id!, existing);
        }
      }
    });

    this.sock.ev.on("chats.upsert", (newChats) => {
      for (const chat of newChats) {
        const existing = this.chats.get(chat.id);
        const info: ChatInfo = {
          id: chat.id,
          name: this.getContactName(chat.id),
          isGroup: isJidGroup(chat.id),
          unreadCount: chat.unreadCount || existing?.unreadCount || 0,
          lastMessage: existing?.lastMessage || null,
          timestamp: (chat.conversationTimestamp as number) || existing?.timestamp || 0,
          muted: (chat.mute || 0) > 0,
          archived: chat.archived || false,
        };
        this.chats.set(chat.id, info);
      }
      this.emit("chats:upsert", this.getChats());
    });

    this.sock.ev.on("chats.update", (updates) => {
      for (const update of updates) {
        const existing = this.chats.get(update.id!);
        if (existing) {
          if (update.unreadCount !== undefined && update.unreadCount !== null) {
            existing.unreadCount = update.unreadCount;
          }
          if (update.conversationTimestamp) {
            existing.timestamp = update.conversationTimestamp as number;
          }
          if (update.archived !== undefined && update.archived !== null) {
            existing.archived = update.archived;
          }
          if (update.mute !== undefined && update.mute !== null) {
            existing.muted = update.mute > 0;
          }
          existing.name = this.getContactName(update.id!);
          this.chats.set(update.id!, existing);
        }
      }
      this.emit("chats:upsert", this.getChats());
    });

    this.sock.ev.on("chats.delete", (deletedIds) => {
      for (const id of deletedIds) {
        this.chats.delete(id);
      }
      this.emit("chats:delete", deletedIds);
    });

    this.sock.ev.on("messages.upsert", async ({ messages, type }) => {
      for (const msg of messages) {
        const info = await this.parseMessage(msg);
        if (!info) continue;

        const chatId = info.chatId;
        const existing = this.chats.get(chatId);
        if (existing) {
          existing.lastMessage = info;
          existing.timestamp = info.timestamp;
          existing.name = this.getContactName(chatId);
          if (!info.fromMe && type === "notify") {
            existing.unreadCount = (existing.unreadCount || 0) + 1;
          }
        } else {
          this.chats.set(chatId, {
            id: chatId,
            name: this.getContactName(chatId),
            isGroup: isJidGroup(chatId),
            unreadCount: info.fromMe ? 0 : 1,
            lastMessage: info,
            timestamp: info.timestamp,
            muted: false,
            archived: false,
          });
        }

        this.emit("messages:upsert", [info]);
      }
      this.emit("chats:upsert", this.getChats());
    });

    this.sock.ev.on("messages.update", (updates) => {
      const statusUpdates: { id: string; chatId: string; status: MessageInfo["status"] }[] = [];
      for (const update of updates) {
        if (update.update.status) {
          const statusMap: Record<number, MessageInfo["status"]> = {
            1: "pending",
            2: "sent",
            3: "delivered",
            4: "read",
          };
          statusUpdates.push({
            id: update.key.id!,
            chatId: update.key.remoteJid!,
            status: statusMap[update.update.status] || "sent",
          });
        }
      }
      if (statusUpdates.length > 0) {
        this.emit("messages:status", statusUpdates);
      }
    });

    this.sock.ev.on("presence.update", (presence) => {
      const jid = presence.id;
      const presences = presence.presences;
      for (const [participant, info] of Object.entries(presences)) {
        const update: PresenceInfo = {
          chatId: jid,
          participant: isJidGroup(jid) ? participant : undefined,
          status: info.lastKnownPresence as PresenceInfo["status"],
          lastSeen: info.lastSeen || undefined,
        };
        this.emit("presence:update", update);
      }
    });

    this.sock.ev.on("groups.upsert", (groups) => {
      for (const group of groups) {
        const existing = this.chats.get(group.id);
        if (existing) {
          existing.name = group.subject;
          existing.participantCount = group.participants.length;
          this.chats.set(group.id, existing);
        }
        this.contacts.set(group.id, {
          id: group.id,
          name: group.subject,
          isGroup: true,
        });
      }
      this.emit("chats:upsert", this.getChats());
    });

    this.sock.ev.on("groups.update", (updates) => {
      for (const update of updates) {
        const existing = this.chats.get(update.id!);
        if (existing && update.subject) {
          existing.name = update.subject;
          this.chats.set(update.id!, existing);
        }
      }
      this.emit("chats:upsert", this.getChats());
    });
  }

  private async parseMessage(msg: WAMessage): Promise<MessageInfo | null> {
    if (!msg.message || msg.key.remoteJid === "status@broadcast") return null;

    const chatId = msg.key.remoteJid!;
    const fromMe = msg.key.fromMe || false;
    const sender = fromMe
      ? jidNormalizedUser(this.sock?.user?.id || "")
      : msg.key.participant || msg.key.remoteJid!;

    const contentType = getContentType(msg.message);
    if (!contentType) return null;

    let type: MessageInfo["type"] = "unknown";
    let text: string | undefined;
    let caption: string | undefined;
    let mediaMimeType: string | undefined;
    let mediaDuration: number | undefined;

    const content = msg.message[contentType as keyof typeof msg.message] as any;

    switch (contentType) {
      case "conversation":
        type = "text";
        text = msg.message.conversation || undefined;
        break;
      case "extendedTextMessage":
        type = "text";
        text = msg.message.extendedTextMessage?.text || undefined;
        break;
      case "imageMessage":
        type = "image";
        caption = content?.caption || undefined;
        mediaMimeType = content?.mimetype || undefined;
        break;
      case "videoMessage":
        type = "video";
        caption = content?.caption || undefined;
        mediaMimeType = content?.mimetype || undefined;
        mediaDuration = content?.seconds || undefined;
        break;
      case "audioMessage":
        type = content?.ptt ? "voice" : "audio";
        mediaMimeType = content?.mimetype || undefined;
        mediaDuration = content?.seconds || undefined;
        break;
      case "documentMessage":
        type = "document";
        caption = content?.fileName || undefined;
        mediaMimeType = content?.mimetype || undefined;
        break;
      case "stickerMessage":
        type = "sticker";
        mediaMimeType = content?.mimetype || undefined;
        break;
      default:
        type = "unknown";
    }

    let quotedMessage: QuotedMessage | undefined;
    const contextInfo = content?.contextInfo;
    if (contextInfo?.quotedMessage) {
      const quotedType = getContentType(contextInfo.quotedMessage);
      let quotedText: string | undefined;
      if (quotedType === "conversation") {
        quotedText = contextInfo.quotedMessage.conversation || undefined;
      } else if (quotedType === "extendedTextMessage") {
        quotedText = contextInfo.quotedMessage.extendedTextMessage?.text || undefined;
      }
      quotedMessage = {
        id: contextInfo.stanzaId || "",
        text: quotedText,
        sender: contextInfo.participant || chatId,
        senderName: this.getContactName(contextInfo.participant || chatId),
        type: quotedType === "imageMessage" ? "image" : quotedType === "audioMessage" ? "voice" : "text",
      };
    }

    const statusMap: Record<number, MessageInfo["status"]> = {
      0: "pending",
      1: "pending",
      2: "sent",
      3: "delivered",
      4: "read",
    };

    return {
      id: msg.key.id!,
      chatId,
      fromMe,
      sender,
      senderName: this.getContactName(sender),
      timestamp: msg.messageTimestamp as number,
      type,
      text,
      caption,
      mediaMimeType,
      mediaDuration,
      quotedMessage,
      isForwarded: contextInfo?.isForwarded || false,
      status: fromMe ? statusMap[msg.status || 0] : undefined,
      groupParticipant: isJidGroup(chatId) && !fromMe ? sender : undefined,
    };
  }

  async sendTextMessage(chatId: string, text: string, quotedId?: string): Promise<MessageInfo | null> {
    if (!this.sock) return null;
    const quoted = quotedId ? { key: { remoteJid: chatId, id: quotedId } } as any : undefined;
    const sent = await this.sock.sendMessage(chatId, { text }, { quoted });
    if (!sent) return null;
    return this.parseMessage(sent);
  }

  async sendImageMessage(chatId: string, imageBuffer: Buffer, caption?: string, mimeType?: string): Promise<MessageInfo | null> {
    if (!this.sock) return null;
    const sent = await this.sock.sendMessage(chatId, {
      image: imageBuffer,
      caption: caption || undefined,
      mimetype: (mimeType as any) || "image/jpeg",
    });
    if (!sent) return null;
    return this.parseMessage(sent);
  }

  async sendVoiceMessage(chatId: string, audioBuffer: Buffer): Promise<MessageInfo | null> {
    if (!this.sock) return null;
    const sent = await this.sock.sendMessage(chatId, {
      audio: audioBuffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    });
    if (!sent) return null;
    return this.parseMessage(sent);
  }

  async downloadMedia(msg: WAMessage): Promise<Buffer | null> {
    try {
      const buffer = await downloadMediaMessage(msg, "buffer", {}, {
        logger,
        reuploadRequest: this.sock!.updateMediaMessage,
      });
      return buffer as Buffer;
    } catch (e) {
      console.error("[WA] Media download failed:", e);
      return null;
    }
  }

  async getMessagesForChat(chatId: string, limit = 50, before?: string): Promise<MessageInfo[]> {
    if (!this.sock) return [];
    try {
      const cursor = before ? { before: { id: before, fromMe: false } } : undefined;
      const messages = await this.sock.fetchMessages(chatId, limit, cursor);
      const parsed: MessageInfo[] = [];
      for (const msg of messages) {
        const info = await this.parseMessage(msg);
        if (info) parsed.push(info);
      }
      return parsed.sort((a, b) => a.timestamp - b.timestamp);
    } catch (e) {
      console.error("[WA] Failed to fetch messages:", e);
      return [];
    }
  }

  async markAsRead(chatId: string, messageIds: string[]): Promise<void> {
    if (!this.sock) return;
    try {
      await this.sock.readMessages([
        ...messageIds.map((id) => ({ remoteJid: chatId, id, participant: undefined })),
      ]);
      const chat = this.chats.get(chatId);
      if (chat) {
        chat.unreadCount = 0;
        this.chats.set(chatId, chat);
        this.emit("chats:upsert", this.getChats());
      }
    } catch (e) {
      console.error("[WA] Mark as read failed:", e);
    }
  }

  async sendTyping(chatId: string): Promise<void> {
    if (!this.sock) return;
    await this.sock.sendPresenceUpdate("composing", chatId);
  }

  async sendRecording(chatId: string): Promise<void> {
    if (!this.sock) return;
    await this.sock.sendPresenceUpdate("recording", chatId);
  }

  async sendPaused(chatId: string): Promise<void> {
    if (!this.sock) return;
    await this.sock.sendPresenceUpdate("paused", chatId);
  }

  async getProfilePicUrl(jid: string): Promise<string | undefined> {
    if (!this.sock) return undefined;
    try {
      return await this.sock.profilePictureUrl(jid, "image");
    } catch {
      return undefined;
    }
  }

  async getGroupMetadata(jid: string) {
    if (!this.sock) return null;
    try {
      return await this.sock.groupMetadata(jid);
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
      this.connectionStatus = { state: "disconnected" };
      this.emit("connection:update", this.connectionStatus);
    }
  }
}

export const waClient = new WhatsAppClient();
