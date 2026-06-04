import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { setStatusBarHidden } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import { HapticProvider } from "@/contexts/HapticContext";
import { InvertColorsProvider, useInvertColors } from "@/contexts/InvertColorsContext";
import { ServerConfigProvider } from "@/contexts/ServerConfigContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { ContactsProvider } from "@/contexts/ContactsContext";
import { ChatsProvider } from "@/contexts/ChatsContext";
import { MessagesProvider } from "@/contexts/MessagesContext";

function RootNavigation() {
    const { invertColors } = useInvertColors();

    useEffect(() => {
        SystemUI.setBackgroundColorAsync(invertColors ? "white" : "black");
        NavigationBar.setVisibilityAsync("hidden");
    }, [invertColors]);

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: "none",
                contentStyle: { backgroundColor: invertColors ? "white" : "black" },
            }}
        >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="qr-setup" />
            <Stack.Screen name="new-chat" />
            <Stack.Screen name="media-viewer" />
            <Stack.Screen name="settings/server" />
            <Stack.Screen name="settings/customise" />
            <Stack.Screen name="settings/customise-interface" />
            <Stack.Screen name="confirm" />
        </Stack>
    );
}

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        "PublicSans-Regular": require("../assets/fonts/PublicSans-Regular.ttf"),
    });

    useEffect(() => {
        setStatusBarHidden(true, "none");
    }, []);

    useEffect(() => {
        if (fontsLoaded || fontError) SplashScreen.hideAsync();
    }, [fontsLoaded, fontError]);

    if (!fontsLoaded && !fontError) return null;

    return (
        <InvertColorsProvider>
            <HapticProvider>
                <ServerConfigProvider>
                    <WebSocketProvider>
                        <ConnectionProvider>
                            <ContactsProvider>
                                <ChatsProvider>
                                    <MessagesProvider>
                                        <RootNavigation />
                                    </MessagesProvider>
                                </ChatsProvider>
                            </ContactsProvider>
                        </ConnectionProvider>
                    </WebSocketProvider>
                </ServerConfigProvider>
            </HapticProvider>
        </InvertColorsProvider>
    );
}
