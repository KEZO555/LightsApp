import React, { useMemo } from "react";
import { View, StyleSheet, Image } from "react-native";
import { router } from "expo-router";
import ContentContainer from "@/components/ContentContainer";
import { StyledText } from "@/components/StyledText";
import { CenteredMessage } from "@/components/CenteredMessage";
import { useConnection } from "@/contexts/ConnectionContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useServerConfig } from "@/contexts/ServerConfigContext";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

export default function QrSetupScreen() {
    const { waStatus } = useConnection();
    const { wsState } = useWebSocket();
    const { httpUrl } = useServerConfig();
    const { invertColors } = useInvertColors();

    // Re-fetch the PNG whenever the underlying QR string changes.
    const qrUri = useMemo(
        () => (waStatus.qr ? `${httpUrl}/api/qr/image?t=${encodeURIComponent(waStatus.qr.slice(0, 16))}` : null),
        [waStatus.qr, httpUrl],
    );

    if (wsState !== "connected") {
        return (
            <ContentContainer headerTitle="Link Device">
                <CenteredMessage
                    message="Server offline"
                    hint="Check your bridge address in Settings"
                />
            </ContentContainer>
        );
    }

    if (waStatus.state === "connected") {
        return (
            <ContentContainer headerTitle="Link Device">
                <CenteredMessage
                    message="Device linked"
                    hint={waStatus.user?.name ? `Connected as ${waStatus.user.name}` : "WhatsApp is connected"}
                />
            </ContentContainer>
        );
    }

    return (
        <ContentContainer headerTitle="Link Device">
            <View style={styles.wrapper}>
                <StyledText style={styles.heading}>Scan to link</StyledText>
                {qrUri ? (
                    <View style={[styles.qrFrame, { backgroundColor: "white" }]}>
                        <Image source={{ uri: qrUri }} style={styles.qr} resizeMode="contain" />
                    </View>
                ) : (
                    <View style={styles.qrFrame}>
                        <StyledText style={{ color: "black" }}>Generating QR…</StyledText>
                    </View>
                )}
                <View style={styles.steps}>
                    <Step n={1} text="Open WhatsApp on your phone" invert={invertColors} />
                    <Step n={2} text="Settings → Linked Devices → Link a Device" invert={invertColors} />
                    <Step n={3} text="Point your phone at this screen" invert={invertColors} />
                </View>
            </View>
        </ContentContainer>
    );
}

function Step({ n: num, text, invert }: { n: number; text: string; invert: boolean }) {
    const dim = invert ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)";
    return (
        <View style={styles.stepRow}>
            <StyledText style={[styles.stepNum, { color: dim }]}>{num}.</StyledText>
            <StyledText style={[styles.stepText, { color: dim }]}>{text}</StyledText>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        alignItems: "center",
        gap: n(20),
    },
    heading: {
        fontSize: n(22),
    },
    qrFrame: {
        width: n(240),
        height: n(240),
        borderRadius: n(12),
        alignItems: "center",
        justifyContent: "center",
        padding: n(12),
    },
    qr: {
        width: "100%",
        height: "100%",
    },
    steps: {
        width: "100%",
        gap: n(10),
    },
    stepRow: {
        flexDirection: "row",
        gap: n(8),
    },
    stepNum: {
        fontSize: n(15),
    },
    stepText: {
        fontSize: n(15),
        flexShrink: 1,
    },
});
