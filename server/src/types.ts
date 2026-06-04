// Shared wire types between the bridge server and the LightsApp client.
// The app keeps its own mirror of these in contexts/*.

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "voice"
  | "document"
  | "sticker"
  | "location"
  | "unknown";

export type MessageStatus = "pending" | "sent" | "delivered" | "read";

export interface QuotedMessage {
  id: string;
  text?: string;
  senderName: string;
  type: MessageType;
}

export interface MessageInfo {
  id: string;
  chatId: string;
  fromMe: boolean;
  sender: string;
  senderName: string;
  timestamp: number; // unix seconds
  type: MessageType;
  text?: string;
  caption?: string;
  /** Relative path served by the bridge, e.g. "/media/<chatId>/<id>". */
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaDuration?: number; // seconds, for audio/video/voice
  /** Inline preview (data URI) for images/video/stickers, instant on e-ink. */
  thumbnail?: string;
  quotedMessage?: QuotedMessage;
  isForwarded?: boolean;
  status?: MessageStatus;
  /** JID of the sender within a group (only for incoming group messages). */
  groupParticipant?: string;
}

export interface ChatInfo {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage: MessageInfo | null;
  timestamp: number;
  muted: boolean;
  archived: boolean;
  participantCount?: number;
}

export interface ContactInfo {
  id: string;
  name: string;
  notify?: string;
  isGroup: boolean;
}

export interface PresenceInfo {
  chatId: string;
  participant?: string;
  status: "available" | "unavailable" | "composing" | "recording" | "paused";
  lastSeen?: number;
}

export interface ConnectionStatus {
  state: "disconnected" | "connecting" | "qr" | "connected";
  /** Raw QR string; the app renders it (or fetches a PNG from /api/qr/image). */
  qr?: string;
  user?: { id: string; name: string };
}

export interface ClientMessage {
  event: string;
  data: unknown;
  id?: string;
}
