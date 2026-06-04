// Client-side mirror of the bridge server's wire types.

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
    timestamp: number;
    type: MessageType;
    text?: string;
    caption?: string;
    mediaUrl?: string;
    mediaMimeType?: string;
    mediaDuration?: number;
    thumbnail?: string;
    quotedMessage?: QuotedMessage;
    isForwarded?: boolean;
    status?: MessageStatus;
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
    qr?: string;
    user?: { id: string; name: string };
}
