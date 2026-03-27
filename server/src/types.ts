export interface ServerMessage {
  event: string;
  data: unknown;
}

export interface ClientMessage {
  event: string;
  data: unknown;
  id?: string;
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
  profilePicUrl?: string;
}

export interface MessageInfo {
  id: string;
  chatId: string;
  fromMe: boolean;
  sender: string;
  senderName: string;
  timestamp: number;
  type: "text" | "image" | "video" | "audio" | "voice" | "document" | "sticker" | "unknown";
  text?: string;
  caption?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaSize?: number;
  mediaDuration?: number;
  thumbnailBase64?: string;
  quotedMessage?: QuotedMessage;
  isForwarded?: boolean;
  status?: "pending" | "sent" | "delivered" | "read";
  groupParticipant?: string;
}

export interface QuotedMessage {
  id: string;
  text?: string;
  sender: string;
  senderName: string;
  type: MessageInfo["type"];
}

export interface ContactInfo {
  id: string;
  name: string;
  notify?: string;
  profilePicUrl?: string;
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
  qr?: string;
  user?: { id: string; name: string };
}

export interface SendMessagePayload {
  chatId: string;
  text?: string;
  mediaBase64?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
  voiceBase64?: string;
  quotedMessageId?: string;
}
