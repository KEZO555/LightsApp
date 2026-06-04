import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { wsClient } from "@/utils/websocket";
import { useWebSocket } from "./WebSocketContext";
import type { MessageInfo, MessageStatus } from "@/utils/types";

interface MessagesContextValue {
    getMessages: (chatId: string) => MessageInfo[];
    fetchMessages: (chatId: string, before?: string) => Promise<void>;
    sendText: (chatId: string, text: string, quotedId?: string) => Promise<void>;
    sendImage: (chatId: string, base64: string, caption?: string, mimeType?: string) => Promise<void>;
    sendVoice: (chatId: string, base64: string) => Promise<void>;
    markAsRead: (chatId: string, ids: string[]) => void;
}

const MessagesContext = createContext<MessagesContextValue>({
    getMessages: () => [],
    fetchMessages: async () => {},
    sendText: async () => {},
    sendImage: async () => {},
    sendVoice: async () => {},
    markAsRead: () => {},
});

export function MessagesProvider({ children }: { children: React.ReactNode }) {
    const store = useRef<Map<string, MessageInfo[]>>(new Map());
    const [, setVersion] = useState(0);
    const bump = useCallback(() => setVersion((v) => v + 1), []);
    const { request, send } = useWebSocket();

    const mergeMessages = useCallback((chatId: string, incoming: MessageInfo[]) => {
        if (incoming.length === 0) return;
        const existing = store.current.get(chatId) ?? [];
        const byId = new Map(existing.map((m) => [m.id, m]));
        for (const msg of incoming) byId.set(msg.id, msg);
        const merged = Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp);
        store.current.set(chatId, merged);
    }, []);

    useEffect(() => {
        const onUpsert = (msgs: MessageInfo[]) => {
            const byChat = new Map<string, MessageInfo[]>();
            for (const m of msgs) {
                const arr = byChat.get(m.chatId) ?? [];
                arr.push(m);
                byChat.set(m.chatId, arr);
            }
            for (const [chatId, arr] of byChat) mergeMessages(chatId, arr);
            bump();
        };

        const onStatus = (updates: { id: string; chatId: string; status: MessageStatus }[]) => {
            for (const u of updates) {
                const msg = store.current.get(u.chatId)?.find((m) => m.id === u.id);
                if (msg) msg.status = u.status;
            }
            bump();
        };

        wsClient.on("messages:upsert", onUpsert);
        wsClient.on("messages:status", onStatus);
        return () => {
            wsClient.removeListener("messages:upsert", onUpsert);
            wsClient.removeListener("messages:status", onStatus);
        };
    }, [mergeMessages, bump]);

    const getMessages = useCallback((chatId: string) => store.current.get(chatId) ?? [], []);

    const fetchMessages = useCallback(
        async (chatId: string, before?: string) => {
            try {
                const msgs = await request<MessageInfo[]>("chat:fetch-messages", { chatId, before });
                if (msgs?.length) {
                    mergeMessages(chatId, msgs);
                    bump();
                }
            } catch (e) {
                console.warn("[Messages] fetch failed:", e);
            }
        },
        [request, mergeMessages, bump],
    );

    const sendText = useCallback(
        async (chatId: string, text: string, quotedId?: string) => {
            const sent = await request<MessageInfo | null>("message:send", {
                chatId,
                text,
                quotedMessageId: quotedId,
            });
            if (sent) {
                mergeMessages(chatId, [sent]);
                bump();
            }
        },
        [request, mergeMessages, bump],
    );

    const sendImage = useCallback(
        async (chatId: string, base64: string, caption?: string, mimeType?: string) => {
            const sent = await request<MessageInfo | null>("message:send-image", {
                chatId,
                imageBase64: base64,
                caption,
                mimeType,
            });
            if (sent) {
                mergeMessages(chatId, [sent]);
                bump();
            }
        },
        [request, mergeMessages, bump],
    );

    const sendVoice = useCallback(
        async (chatId: string, base64: string) => {
            const sent = await request<MessageInfo | null>("message:send-voice", {
                chatId,
                audioBase64: base64,
            });
            if (sent) {
                mergeMessages(chatId, [sent]);
                bump();
            }
        },
        [request, mergeMessages, bump],
    );

    const markAsRead = useCallback(
        (chatId: string, ids: string[]) => send("message:read", { chatId, messageIds: ids }),
        [send],
    );

    return (
        <MessagesContext.Provider
            value={{ getMessages, fetchMessages, sendText, sendImage, sendVoice, markAsRead }}
        >
            {children}
        </MessagesContext.Provider>
    );
}

export const useMessages = () => useContext(MessagesContext);
