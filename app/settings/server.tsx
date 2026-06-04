import React, { useState, useCallback } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { router } from "expo-router";
import ContentContainer from "@/components/ContentContainer";
import { StyledText } from "@/components/StyledText";
import { StyledButton } from "@/components/StyledButton";
import { useServerConfig } from "@/contexts/ServerConfigContext";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

export default function ServerSettingsScreen() {
    const { serverUrl, setServerUrl } = useServerConfig();
    const { invertColors } = useInvertColors();
    const [value, setValue] = useState(serverUrl);

    const fg = invertColors ? "black" : "white";
    const dim = invertColors ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";

    const save = useCallback(async () => {
        let url = value.trim();
        if (url && !/^wss?:\/\//.test(url)) url = `ws://${url}`;
        await setServerUrl(url);
        router.back();
    }, [value, setServerUrl]);

    return (
        <ContentContainer headerTitle="Bridge Server">
            <View style={styles.block}>
                <StyledText style={[styles.hint, { color: dim }]}>
                    Address of your self-hosted Baileys bridge.
                </StyledText>
                <TextInput
                    style={[styles.input, { color: fg, borderBottomColor: fg }]}
                    value={value}
                    onChangeText={setValue}
                    placeholder="ws://192.168.1.100:3001"
                    placeholderTextColor={dim}
                    cursorColor={fg}
                    selectionColor={fg}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    allowFontScaling={false}
                />
                <StyledText style={[styles.example, { color: dim }]}>
                    Use ws:// on a local network, wss:// for a secured remote server.
                </StyledText>
            </View>
            <StyledButton text="Save" onPress={save} underline />
        </ContentContainer>
    );
}

const styles = StyleSheet.create({
    block: {
        width: "100%",
        gap: n(12),
    },
    hint: {
        fontSize: n(15),
    },
    input: {
        fontSize: n(24),
        fontFamily: "PublicSans-Regular",
        borderBottomWidth: n(1),
        paddingVertical: n(4),
    },
    example: {
        fontSize: n(13),
    },
});
