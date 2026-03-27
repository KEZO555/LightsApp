import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { AppState } from "react-native";
import { wsClient } from "@/utils/websocket";
import { useServerConfig } from "./ServerConfigContext";

type WSState = "disconnected" | "connecting" | "connected";

interface WebSocketContextValue {
    wsState: WSState;
    send: (event: string, data: unknown) => void;
    request: <T = unknown>(event: string, data: unknown, timeout?: number) => Promise<T>;
}

const WebSocketContext = createContext<WebSocketContextValue>({
    wsState: "disconnected",
    send: () => {},
    request: () => Promise.reject(new Error("Not connected")),
});

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { serverUrl } = useServerConfig();
    const [wsState, setWsState] = useState<WSState>("disconnected");
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        const handler = (state: WSState) => setWsState(state);
        wsClient.on("state", handler);
        return () => { wsClient.removeListener("state", handler); };
    }, []);

    useEffect(() => {
        if (serverUrl) {
            wsClient.connect(serverUrl);
        }
        return () => { wsClient.disconnect(); };
    }, [serverUrl]);

    useEffect(() => {
        const sub = AppState.addEventListener("change", (nextState) => {
            if (appState.current.match(/inactive|background/) && nextState === "active") {
                if (serverUrl) wsClient.connect(serverUrl);
            }
            appState.current = nextState;
        });
        return () => sub.remove();
    }, [serverUrl]);

    const send = useCallback((event: string, data: unknown) => {
        wsClient.send(event, data);
    }, []);

    const request = useCallback(<T = unknown,>(event: string, data: unknown, timeout?: number) => {
        return wsClient.request<T>(event, data, timeout);
    }, []);

    return (
        <WebSocketContext.Provider value={{ wsState, send, request }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export const useWebSocket = () => useContext(WebSocketContext);
