import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { wsClient } from "@/utils/websocket";
import { useWebSocket } from "./WebSocketContext";

interface MessageInfo {
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
    quotedMessage?: {
        id: string;
        text?: string;
        sender: string;
        senderName: string;
        type: MessageInfo["type"];
    };
    isForwarded?: boolean;
    status?: "pending" | "sent" | "delivered" | "read";
    groupParticipant?: string;
}

interface MessagesContextValue {
    getMessages: (chatId: string) => MessageInfo[];
    fetchMessages: (chatId: string, before?: string) => Promise<MessageInfo[]>;
    sendTextMessage: (chatId: string, text: string, quotedId?: string) => Promise<void>;
    sendImageMessage: (chatId: string, imageBase64: string, caption?: string, mimeType?: string) => Promise<void>;
    sendVoiceMessage: (chatId: string, audioBase64: string) => Promise<void>;
    markAsRead: (chatId: string, messageIds: string[]) => void;
}

const MessagesContext = createContext<MessagesContextValue>({
    getMessages: () => [],
    fetchMessages: async () => [],
    sendTextMessage: async () => {},
    sendImageMessage: async () => {},
    sendVoiceMessage: async () => {},
    markAsRead: () => {},
});

export function MessagesProvider({ children }: { children: React.ReactNode }) {
    const messagesRef = useRef<Map<string, MessageInfo[]>>(new Map());
    const [version, setVersion] = useState(0);
    const { request, send } = useWebSocket();

    useEffect(() => {
        const onMessagesUpsert = (msgs: MessageInfo[]) => {
            const map = messagesRef.current;
            for (const msg of msgs) {
                const existing = map.get(msg.chatId) || [];
                const idx = existing.findIndex((m) => m.id === msg.id);
                if (idx >= 0) {
                    existing[idx] = msg;
                } else {
                    existing.push(msg);
                }
                existing.sort((a, b) => a.timestamp - b.timestamp);
                map.set(msg.chatId, existing);
            }
            setVersion((v) => v + 1);
        };

        const onMessagesStatus = (updates: { id: string; chatId: string; status: MessageInfo["status"] }[]) => {
            const map = messagesRef.current;
            for (const update of updates) {
                const msgs = map.get(update.chatId);
                if (msgs) {
                    const msg = msgs.find((m) => m.id === update.id);
                    if (msg) msg.status = update.status;
                }
            }
            setVersion((v) => v + 1);
        };

        wsClient.on("messages:upsert", onMessagesUpsert);
        wsClient.on("messages:status", onMessagesStatus);

        return () => {
            wsClient.removeListener("messages:upsert", onMessagesUpsert);
            wsClient.removeListener("messages:status", onMessagesStatus);
        };
    }, []);

    const getMessages = useCallback(
        (chatId: string) => messagesRef.current.get(chatId) || [],
        [version]
    );

    const fetchMessages = useCallback(
        async (chatId: string, before?: string) => {
            try {
                const msgs = await request<MessageInfo[]>("chat:fetch-messages", {
                    chatId,
                    limit: 50,
                    before,
                });
                if (msgs && msgs.length > 0) {
                    const existing = messagesRef.current.get(chatId) || [];
                    const existingIds = new Set(existing.map((m) => m.id));
                    const newMsgs = msgs.filter((m) => !existingIds.has(m.id));
                    const merged = [...newMsgs, ...existing].sort((a, b) => a.timestamp - b.timestamp);
                    messagesRef.current.set(chatId, merged);
                    setVersion((v) => v + 1);
                    return msgs;
                }
                return [];
            } catch (e) {
                console.warn("[Messages] Fetch failed:", e);
                return [];
            }
        },
        [request]
    );

    const sendTextMessage = useCallback(
        async (chatId: string, text: string, quotedId?: string) => {
            await request("message:send", { chatId, text, quotedMessageId: quotedId });
        },
        [request]
    );

    const sendImageMessage = useCallback(
        async (chatId: string, imageBase64: string, caption?: string, mimeType?: string) => {
            await request("message:send-image", { chatId, imageBase64, caption, mimeType });
        },
        [request]
    );

    const sendVoiceMessage = useCallback(
        async (chatId: string, audioBase64: string) => {
            await request("message:send-voice", { chatId, audioBase64 });
        },
        [request]
    );

    const markAsRead = useCallback(
        (chatId: string, messageIds: string[]) => {
            send("message:read", { chatId, messageIds });
        },
        [send]
    );

    return (
        <MessagesContext.Provider
            value={{ getMessages, fetchMessages, sendTextMessage, sendImageMessage, sendVoiceMessage, markAsRead }}
        >
            {children}
        </MessagesContext.Provider>
    );
}

export const useMessages = () => useContext(MessagesContext);
export type { MessageInfo };
