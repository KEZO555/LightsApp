import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { StyledButton } from "@/components/StyledButton";
import { StyledText } from "@/components/StyledText";
import ContentContainer from "@/components/ContentContainer";
import { SelectorButton } from "@/components/SelectorButton";
import { Separator } from "@/components/Separator";
import { useConnection } from "@/contexts/ConnectionContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useServerConfig } from "@/contexts/ServerConfigContext";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

export default function SettingsScreen() {
    const { waStatus } = useConnection();
    const { wsState } = useWebSocket();
    const { serverUrl } = useServerConfig();
    const { invertColors } = useInvertColors();

    const dim = invertColors ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";

    const status =
        wsState !== "connected"
            ? "Server offline"
            : waStatus.state === "connected"
                ? `Linked${waStatus.user?.name ? ` — ${waStatus.user.name}` : ""}`
                : waStatus.state === "qr"
                    ? "Waiting for QR scan"
                    : "Linking…";

    const dotColor =
        wsState === "connected" && waStatus.state === "connected"
            ? invertColors
                ? "black"
                : "white"
            : dim;

    return (
        <ContentContainer headerTitle="Settings" hideBackButton>
            <View style={styles.section}>
                <StyledText style={[styles.label, { color: dim }]}>CONNECTION</StyledText>
                <SelectorButton
                    label="Bridge server"
                    value={serverUrl.replace(/^wss?:\/\//, "")}
                    href={"/settings/server" as any}
                />
                <View style={styles.statusRow}>
                    <View style={[styles.dot, { backgroundColor: dotColor }]} />
                    <StyledText style={[styles.statusText, { color: dim }]}>{status}</StyledText>
                </View>
            </View>

            <Separator />

            <View style={styles.section}>
                <StyledText style={[styles.label, { color: dim }]}>WHATSAPP</StyledText>
                <StyledButton
                    text={waStatus.state === "connected" ? "Re-link Device" : "Link Device"}
                    onPress={() => router.push("/qr-setup" as any)}
                />
            </View>

            <Separator />

            <View style={styles.section}>
                <StyledText style={[styles.label, { color: dim }]}>APPEARANCE</StyledText>
                <StyledButton
                    text="Customise"
                    onPress={() => router.push("/settings/customise" as any)}
                />
            </View>
        </ContentContainer>
    );
}

const styles = StyleSheet.create({
    section: {
        width: "100%",
        gap: n(8),
    },
    label: {
        fontSize: n(13),
        letterSpacing: n(1),
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: n(8),
    },
    dot: {
        width: n(8),
        height: n(8),
        borderRadius: n(4),
    },
    statusText: {
        fontSize: n(14),
    },
});
