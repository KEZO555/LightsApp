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

    const dimColor = invertColors ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";

    const connectionLabel =
        wsState !== "connected"
            ? "Server offline"
            : waStatus.state === "connected"
                ? `Connected as ${waStatus.user?.name || "Unknown"}`
                : waStatus.state === "qr"
                    ? "Waiting for QR scan"
                    : "Connecting to WhatsApp...";

    return (
        <ContentContainer headerTitle="Settings" hideBackButton>
            <View style={styles.section}>
                <StyledText style={[styles.sectionTitle, { color: dimColor }]}>
                    Connection
                </StyledText>
                <SelectorButton
                    label="Server"
                    value={serverUrl.replace(/^wss?:\/\//, "")}
                    href={"/settings/server" as any}
                />
                <View style={styles.statusRow}>
                    <View
                        style={[
                            styles.statusDot,
                            {
                                backgroundColor:
                                    wsState === "connected" && waStatus.state === "connected"
                                        ? "#4caf50"
                                        : wsState === "connected"
                                            ? "#ff9800"
                                            : "#f44336",
                            },
                        ]}
                    />
                    <StyledText style={[styles.statusText, { color: dimColor }]}>
                        {connectionLabel}
                    </StyledText>
                </View>
            </View>

            <Separator />

            <View style={styles.section}>
                <StyledText style={[styles.sectionTitle, { color: dimColor }]}>
                    WhatsApp
                </StyledText>
                <StyledButton
                    text="Link Device (QR Code)"
                    onPress={() => router.push("/qr-setup" as any)}
                />
            </View>

            <Separator />

            <View style={styles.section}>
                <StyledText style={[styles.sectionTitle, { color: dimColor }]}>
                    Appearance
                </StyledText>
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
        paddingHorizontal: n(20),
        paddingVertical: n(12),
        gap: n(8),
    },
    sectionTitle: {
        fontSize: n(13),
        textTransform: "uppercase",
        letterSpacing: n(1),
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: n(8),
        paddingVertical: n(4),
    },
    statusDot: {
        width: n(8),
        height: n(8),
        borderRadius: n(4),
    },
    statusText: {
        fontSize: n(14),
    },
});
