import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { wsClient } from "@/utils/websocket";
import { useWebSocket } from "./WebSocketContext";
import type { ContactInfo, PresenceInfo } from "@/utils/types";

interface ContactsContextValue {
    contacts: ContactInfo[];
    getPresence: (chatId: string) => PresenceInfo | undefined;
    subscribePresence: (chatId: string) => void;
    resolveNumber: (number: string) => Promise<{ jid: string; exists: boolean }>;
}

const ContactsContext = createContext<ContactsContextValue>({
    contacts: [],
    getPresence: () => undefined,
    subscribePresence: () => {},
    resolveNumber: async () => ({ jid: "", exists: false }),
});

export function ContactsProvider({ children }: { children: React.ReactNode }) {
    const [contacts, setContacts] = useState<ContactInfo[]>([]);
    const presence = useRef<Map<string, PresenceInfo>>(new Map());
    const [, setVersion] = useState(0);
    const { request, send } = useWebSocket();

    useEffect(() => {
        const onContacts = (data: ContactInfo[]) => setContacts(data);
        const onPresence = (p: PresenceInfo) => {
            presence.current.set(p.chatId, p);
            setVersion((v) => v + 1);
        };
        wsClient.on("contacts:upsert", onContacts);
        wsClient.on("presence:update", onPresence);
        return () => {
            wsClient.removeListener("contacts:upsert", onContacts);
            wsClient.removeListener("presence:update", onPresence);
        };
    }, []);

    const getPresence = useCallback((chatId: string) => presence.current.get(chatId), []);

    const subscribePresence = useCallback(
        (chatId: string) => send("presence:subscribe", { chatId }),
        [send],
    );

    const resolveNumber = useCallback(
        (number: string) =>
            request<{ jid: string; exists: boolean }>("contact:resolve", { number }),
        [request],
    );

    return (
        <ContactsContext.Provider
            value={{ contacts, getPresence, subscribePresence, resolveNumber }}
        >
            {children}
        </ContactsContext.Provider>
    );
}

export const useContacts = () => useContext(ContactsContext);
