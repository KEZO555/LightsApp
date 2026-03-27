import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ServerConfig {
    serverUrl: string;
    setServerUrl: (url: string) => Promise<void>;
}

const STORAGE_KEY = "@lightmessage_server_url";
const DEFAULT_URL = "ws://192.168.1.100:3001";

const ServerConfigContext = createContext<ServerConfig>({
    serverUrl: DEFAULT_URL,
    setServerUrl: async () => {},
});

export function ServerConfigProvider({ children }: { children: React.ReactNode }) {
    const [serverUrl, setServerUrlState] = useState(DEFAULT_URL);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((val) => {
            if (val) setServerUrlState(val);
        });
    }, []);

    const setServerUrl = useCallback(async (url: string) => {
        setServerUrlState(url);
        await AsyncStorage.setItem(STORAGE_KEY, url);
    }, []);

    return (
        <ServerConfigContext.Provider value={{ serverUrl, setServerUrl }}>
            {children}
        </ServerConfigContext.Provider>
    );
}

export const useServerConfig = () => useContext(ServerConfigContext);
