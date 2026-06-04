import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@lightsapp_server_url";
const DEFAULT_URL = "ws://192.168.1.100:3001";

/** Derive the HTTP base (for media) from the ws:// URL. */
function toHttpUrl(wsUrl: string): string {
    return wsUrl.replace(/^ws/, "http").replace(/\/$/, "");
}

interface ServerConfigValue {
    serverUrl: string;
    httpUrl: string;
    setServerUrl: (url: string) => Promise<void>;
    loaded: boolean;
}

const ServerConfigContext = createContext<ServerConfigValue>({
    serverUrl: DEFAULT_URL,
    httpUrl: toHttpUrl(DEFAULT_URL),
    setServerUrl: async () => {},
    loaded: false,
});

export function ServerConfigProvider({ children }: { children: React.ReactNode }) {
    const [serverUrl, setUrl] = useState(DEFAULT_URL);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((val) => {
                if (val) setUrl(val);
            })
            .finally(() => setLoaded(true));
    }, []);

    const setServerUrl = useCallback(async (url: string) => {
        const trimmed = url.trim();
        setUrl(trimmed);
        await AsyncStorage.setItem(STORAGE_KEY, trimmed);
    }, []);

    return (
        <ServerConfigContext.Provider
            value={{ serverUrl, httpUrl: toHttpUrl(serverUrl), setServerUrl, loaded }}
        >
            {children}
        </ServerConfigContext.Provider>
    );
}

export const useServerConfig = () => useContext(ServerConfigContext);
