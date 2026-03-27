import React, { useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import ContentContainer from "@/components/ContentContainer";
import { StyledText } from "@/components/StyledText";
import { StyledButton } from "@/components/StyledButton";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useServerConfig } from "@/contexts/ServerConfigContext";
import { n } from "@/utils/scaling";
import { router } from "expo-router";

export default function ServerSettingsScreen() {
    const { invertColors } = useInvertColors();
    const { serverUrl, setServerUrl } = useServerConfig();
    const [url, setUrl] = useState(serverUrl);

    const textColor = invertColors ? "#000" : "#fff";
    const dimColor = invertColors ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)";
    const borderColor = invertColors ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)";

    const handleSave = async () => {
        const trimmed = url.trim();
        if (trimmed) {
            await setServerUrl(trimmed);
            router.back();
        }
    };

    return (
        <ContentContainer headerTitle="Server">
            <View style={styles.content}>
                <StyledText style={[styles.label, { color: dimColor }]}>
                    WebSocket URL
                </StyledText>
                <TextInput
                    style={[styles.input, { color: textColor, borderColor }]}
                    value={url}
                    onChangeText={setUrl}
                    placeholder="ws://192.168.1.100:3001"
                    placeholderTextColor={dimColor}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                />
                <StyledText style={[styles.hint, { color: dimColor }]}>
                    Enter the WebSocket URL of your LightsApp server.{"\n"}
                    Example: ws://192.168.1.100:3001
                </StyledText>
                <View style={styles.buttonRow}>
                    <StyledButton text="Save" onPress={handleSave} />
                </View>
            </View>
        </ContentContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: n(20),
        gap: n(12),
    },
    label: {
        fontSize: n(13),
        textTransform: "uppercase",
        letterSpacing: n(1),
    },
    input: {
        fontSize: n(16),
        fontFamily: "PublicSans-Regular",
        borderWidth: 1,
        borderRadius: n(8),
        paddingHorizontal: n(14),
        paddingVertical: n(12),
    },
    hint: {
        fontSize: n(13),
        lineHeight: n(18),
    },
    buttonRow: {
        marginTop: n(8),
    },
});
