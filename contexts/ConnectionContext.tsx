import React, { createContext, useContext, useState, useEffect } from "react";
import { wsClient } from "@/utils/websocket";

interface ConnectionStatus {
    state: "disconnected" | "connecting" | "qr" | "connected";
    qr?: string;
    user?: { id: string; name: string };
}

interface ConnectionContextValue {
    waStatus: ConnectionStatus;
}

const ConnectionContext = createContext<ConnectionContextValue>({
    waStatus: { state: "disconnected" },
});

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
    const [waStatus, setWaStatus] = useState<ConnectionStatus>({ state: "disconnected" });

    useEffect(() => {
        const handler = (data: ConnectionStatus) => {
            setWaStatus(data);
        };
        wsClient.on("connection:update", handler);
        return () => { wsClient.removeListener("connection:update", handler); };
    }, []);

    return (
        <ConnectionContext.Provider value={{ waStatus }}>
            {children}
        </ConnectionContext.Provider>
    );
}

export const useConnection = () => useContext(ConnectionContext);
export type { ConnectionStatus };
