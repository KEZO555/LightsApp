import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { wsClient } from "@/utils/websocket";

interface ContactInfo {
    id: string;
    name: string;
    notify?: string;
    profilePicUrl?: string;
    isGroup: boolean;
}

interface PresenceInfo {
    chatId: string;
    participant?: string;
    status: "available" | "unavailable" | "composing" | "recording" | "paused";
    lastSeen?: number;
}

interface ContactsContextValue {
    contacts: ContactInfo[];
    presences: Map<string, PresenceInfo>;
    getContact: (id: string) => ContactInfo | undefined;
    getPresence: (chatId: string) => PresenceInfo | undefined;
}

const ContactsContext = createContext<ContactsContextValue>({
    contacts: [],
    presences: new Map(),
    getContact: () => undefined,
    getPresence: () => undefined,
});

export function ContactsProvider({ children }: { children: React.ReactNode }) {
    const [contacts, setContacts] = useState<ContactInfo[]>([]);
    const [presences, setPresences] = useState<Map<string, PresenceInfo>>(new Map());

    useEffect(() => {
        const onContactsUpsert = (data: ContactInfo[]) => {
            setContacts((prev) => {
                const map = new Map(prev.map((c) => [c.id, c]));
                for (const contact of data) {
                    map.set(contact.id, contact);
                }
                return Array.from(map.values());
            });
        };

        const onPresenceUpdate = (data: PresenceInfo) => {
            setPresences((prev) => {
                const next = new Map(prev);
                next.set(data.chatId, data);
                return next;
            });
        };

        wsClient.on("contacts:upsert", onContactsUpsert);
        wsClient.on("presence:update", onPresenceUpdate);

        return () => {
            wsClient.removeListener("contacts:upsert", onContactsUpsert);
            wsClient.removeListener("presence:update", onPresenceUpdate);
        };
    }, []);

    const getContact = useCallback(
        (id: string) => contacts.find((c) => c.id === id),
        [contacts]
    );

    const getPresence = useCallback(
        (chatId: string) => presences.get(chatId),
        [presences]
    );

    return (
        <ContactsContext.Provider value={{ contacts, presences, getContact, getPresence }}>
            {children}
        </ContactsContext.Provider>
    );
}

export const useContacts = () => useContext(ContactsContext);
export type { ContactInfo, PresenceInfo };
