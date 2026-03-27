import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { wsClient } from "@/utils/websocket";

interface ChatInfo {
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
    mediaDuration?: number;
    status?: "pending" | "sent" | "delivered" | "read";
}

interface ChatsContextValue {
    chats: ChatInfo[];
    getChat: (id: string) => ChatInfo | undefined;
}

const ChatsContext = createContext<ChatsContextValue>({
    chats: [],
    getChat: () => undefined,
});

export function ChatsProvider({ children }: { children: React.ReactNode }) {
    const [chats, setChats] = useState<ChatInfo[]>([]);

    useEffect(() => {
        const onChatsUpsert = (data: ChatInfo[]) => {
            setChats(data);
        };

        const onChatsDelete = (ids: string[]) => {
            setChats((prev) => prev.filter((c) => !ids.includes(c.id)));
        };

        wsClient.on("chats:upsert", onChatsUpsert);
        wsClient.on("chats:delete", onChatsDelete);

        return () => {
            wsClient.removeListener("chats:upsert", onChatsUpsert);
            wsClient.removeListener("chats:delete", onChatsDelete);
        };
    }, []);

    const getChat = useCallback(
        (id: string) => chats.find((c) => c.id === id),
        [chats]
    );

    return (
        <ChatsContext.Provider value={{ chats, getChat }}>
            {children}
        </ChatsContext.Provider>
    );
}

export const useChats = () => useContext(ChatsContext);

export type { ChatInfo, MessageInfo };
