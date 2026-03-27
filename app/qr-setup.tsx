import React, { useEffect, useState } from "react";
import { View, StyleSheet, Image } from "react-native";
import ContentContainer from "@/components/ContentContainer";
import { StyledText } from "@/components/StyledText";
import { StyledButton } from "@/components/StyledButton";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useConnection } from "@/contexts/ConnectionContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useServerConfig } from "@/contexts/ServerConfigContext";
import { n } from "@/utils/scaling";
import { router } from "expo-router";

export default function QRSetupScreen() {
    const { invertColors } = useInvertColors();
    const { waStatus } = useConnection();
    const { wsState } = useWebSocket();
    const { serverUrl } = useServerConfig();
    const [qrImage, setQrImage] = useState<string | null>(null);

    const httpUrl = serverUrl.replace(/^ws/, "http");

    useEffect(() => {
        if (waStatus.state !== "qr") {
            setQrImage(null);
            return;
        }
        const fetchQr = async () => {
            try {
                const res = await fetch(`${httpUrl}/api/qr`);
                const data = await res.json();
                if (data.qr) setQrImage(data.qr);
            } catch (e) {
                console.warn("Failed to fetch QR:", e);
            }
        };
        fetchQr();
        const interval = setInterval(fetchQr, 15000);
        return () => clearInterval(interval);
    }, [waStatus.state, httpUrl]);

    const textColor = invertColors ? "#000" : "#fff";
    const dimColor = invertColors ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";

    const renderContent = () => {
        if (wsState !== "connected") {
            return (
                <View style={styles.center}>
                    <StyledText style={[styles.title, { color: textColor }]}>
                        Server Not Connected
                    </StyledText>
                    <StyledText style={[styles.hint, { color: dimColor }]}>
                        Configure your server URL in Settings first
                    </StyledText>
                    <View style={styles.buttonContainer}>
                        <StyledButton
                            text="Open Settings"
                            onPress={() => router.push("/(tabs)/settings" as any)}
                        />
                    </View>
                </View>
            );
        }

        if (waStatus.state === "connected") {
            return (
                <View style={styles.center}>
                    <StyledText style={[styles.title, { color: textColor }]}>
                        Connected
                    </StyledText>
                    <StyledText style={[styles.hint, { color: dimColor }]}>
                        {waStatus.user?.name
                            ? `Linked as ${waStatus.user.name}`
                            : "WhatsApp is linked"}
                    </StyledText>
                    <View style={styles.buttonContainer}>
                        <StyledButton text="Back to Chats" onPress={() => router.back()} />
                    </View>
                </View>
            );
        }

        if (waStatus.state === "qr") {
            return (
                <View style={styles.center}>
                    <StyledText style={[styles.title, { color: textColor }]}>
                        Link WhatsApp
                    </StyledText>
                    <StyledText style={[styles.hint, { color: dimColor }]}>
                        Open WhatsApp on your phone, go to Linked Devices, and scan this code
                    </StyledText>
                    {qrImage ? (
                        <View style={[styles.qrContainer, { backgroundColor: "#fff", borderRadius: n(12) }]}>
                            <Image
                                source={{ uri: qrImage }}
                                style={styles.qrImage}
                                resizeMode="contain"
                            />
                        </View>
                    ) : (
                        <StyledText style={[styles.hint, { color: dimColor }]}>
                            Loading QR code...
                        </StyledText>
                    )}
                </View>
            );
        }

        return (
            <View style={styles.center}>
                <StyledText style={[styles.title, { color: textColor }]}>
                    {waStatus.state === "connecting" ? "Connecting..." : "Waiting for QR Code"}
                </StyledText>
                <StyledText style={[styles.hint, { color: dimColor }]}>
                    Please wait while connecting to WhatsApp
                </StyledText>
            </View>
        );
    };

    return (
        <ContentContainer headerTitle="Setup">
            {renderContent()}
        </ContentContainer>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: n(30),
    },
    title: {
        fontSize: n(24),
        textAlign: "center",
        marginBottom: n(8),
    },
    hint: {
        fontSize: n(15),
        textAlign: "center",
        marginBottom: n(24),
    },
    qrContainer: {
        padding: n(16),
    },
    qrImage: {
        width: n(240),
        height: n(240),
    },
    buttonContainer: {
        marginTop: n(16),
    },
});
