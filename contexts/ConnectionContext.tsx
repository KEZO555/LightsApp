import React, { createContext, useContext, useEffect, useState } from "react";
import { wsClient } from "@/utils/websocket";
import type { ConnectionStatus } from "@/utils/types";

interface ConnectionContextValue {
    waStatus: ConnectionStatus;
}

const ConnectionContext = createContext<ConnectionContextValue>({
    waStatus: { state: "disconnected" },
});

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
    const [waStatus, setWaStatus] = useState<ConnectionStatus>({ state: "disconnected" });

    useEffect(() => {
        const onUpdate = (status: ConnectionStatus) => setWaStatus(status);
        wsClient.on("connection:update", onUpdate);
        return () => wsClient.removeListener("connection:update", onUpdate);
    }, []);

    return (
        <ConnectionContext.Provider value={{ waStatus }}>
            {children}
        </ConnectionContext.Provider>
    );
}

export const useConnection = () => useContext(ConnectionContext);
