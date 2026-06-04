import React, { useState, useCallback, useRef } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { HapticPressable } from "@/components/HapticPressable";
import { StyledText } from "@/components/StyledText";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

interface MessageInputProps {
    onSendText: (text: string) => void;
    onAttachPress: () => void;
    onSendVoice: (base64: string) => void;
    onTyping: () => void;
    onStopTyping: () => void;
    onRecordingChange?: (recording: boolean) => void;
}

export function MessageInput({
    onSendText,
    onAttachPress,
    onSendVoice,
    onTyping,
    onStopTyping,
    onRecordingChange,
}: MessageInputProps) {
    const { invertColors } = useInvertColors();
    const [text, setText] = useState("");
    const [recording, setRecording] = useState(false);
    const recordingRef = useRef<Audio.Recording | null>(null);

    const fg = invertColors ? "black" : "white";
    const dim = invertColors ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
    const borderColor = invertColors ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)";

    const handleChange = useCallback(
        (value: string) => {
            setText(value);
            if (value.length > 0) onTyping();
            else onStopTyping();
        },
        [onTyping, onStopTyping],
    );

    const handleSend = useCallback(() => {
        const trimmed = text.trim();
        if (!trimmed) return;
        onSendText(trimmed);
        setText("");
        onStopTyping();
    }, [text, onSendText, onStopTyping]);

    const startRecording = useCallback(async () => {
        try {
            const perm = await Audio.requestPermissionsAsync();
            if (!perm.granted) return;
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording: rec } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
            );
            recordingRef.current = rec;
            setRecording(true);
            onRecordingChange?.(true);
        } catch (e) {
            console.warn("[Recording] start failed:", e);
        }
    }, [onRecordingChange]);

    const stopRecording = useCallback(
        async (sendIt: boolean) => {
            const rec = recordingRef.current;
            recordingRef.current = null;
            setRecording(false);
            onRecordingChange?.(false);
            if (!rec) return;
            try {
                await rec.stopAndUnloadAsync();
                await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
                const uri = rec.getURI();
                if (sendIt && uri) {
                    const base64 = await FileSystem.readAsStringAsync(uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    onSendVoice(base64);
                }
            } catch (e) {
                console.warn("[Recording] stop failed:", e);
            }
        },
        [onSendVoice, onRecordingChange],
    );

    if (recording) {
        return (
            <View style={[styles.container, { borderTopColor: borderColor }]}>
                <HapticPressable onPress={() => stopRecording(false)} style={styles.iconButton}>
                    <MaterialIcons name="delete-outline" size={n(28)} color={fg} />
                </HapticPressable>
                <View style={styles.recordingLabel}>
                    <View style={[styles.recDot, { backgroundColor: fg }]} />
                    <StyledText style={[styles.recordingText, { color: fg }]}>
                        Recording…
                    </StyledText>
                </View>
                <HapticPressable onPress={() => stopRecording(true)} style={styles.iconButton}>
                    <MaterialIcons name="send" size={n(28)} color={fg} />
                </HapticPressable>
            </View>
        );
    }

    return (
        <View style={[styles.container, { borderTopColor: borderColor }]}>
            <HapticPressable onPress={onAttachPress} style={styles.iconButton}>
                <MaterialIcons name="add" size={n(28)} color={fg} />
            </HapticPressable>
            <TextInput
                style={[styles.input, { color: fg, borderColor }]}
                value={text}
                onChangeText={handleChange}
                placeholder="Message"
                placeholderTextColor={dim}
                cursorColor={fg}
                selectionColor={fg}
                allowFontScaling={false}
                multiline
            />
            {text.trim().length > 0 ? (
                <HapticPressable onPress={handleSend} style={styles.iconButton}>
                    <MaterialIcons name="send" size={n(28)} color={fg} />
                </HapticPressable>
            ) : (
                <HapticPressable onPress={startRecording} style={styles.iconButton}>
                    <MaterialIcons name="mic" size={n(28)} color={fg} />
                </HapticPressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: n(10),
        paddingVertical: n(7),
        gap: n(6),
        borderTopWidth: n(1),
    },
    iconButton: {
        width: n(40),
        height: n(40),
        alignItems: "center",
        justifyContent: "center",
    },
    input: {
        flex: 1,
        fontSize: n(16),
        fontFamily: "PublicSans-Regular",
        borderWidth: n(1),
        borderRadius: n(18),
        paddingHorizontal: n(14),
        paddingTop: n(8),
        paddingBottom: n(8),
        maxHeight: n(120),
    },
    recordingLabel: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: n(8),
        paddingHorizontal: n(10),
    },
    recDot: {
        width: n(10),
        height: n(10),
        borderRadius: n(5),
    },
    recordingText: {
        fontSize: n(16),
    },
});
