import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { wsClient } from "@/utils/websocket";
import type { ChatInfo } from "@/utils/types";

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
        const onUpsert = (data: ChatInfo[]) => setChats(data);
        const onDelete = (ids: string[]) =>
            setChats((prev) => prev.filter((c) => !ids.includes(c.id)));

        wsClient.on("chats:upsert", onUpsert);
        wsClient.on("chats:delete", onDelete);
        return () => {
            wsClient.removeListener("chats:upsert", onUpsert);
            wsClient.removeListener("chats:delete", onDelete);
        };
    }, []);

    const getChat = useCallback((id: string) => chats.find((c) => c.id === id), [chats]);

    return (
        <ChatsContext.Provider value={{ chats, getChat }}>{children}</ChatsContext.Provider>
    );
}

export const useChats = () => useContext(ChatsContext);
