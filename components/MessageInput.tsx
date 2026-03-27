import React, { useState, useCallback, useRef } from "react";
import { View, TextInput, StyleSheet, Keyboard } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { HapticPressable } from "./HapticPressable";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

interface MessageInputProps {
    onSendText: (text: string) => void;
    onAttachPress: () => void;
    onVoiceStart: () => void;
    onVoiceEnd: () => void;
    onTyping: () => void;
    onStopTyping: () => void;
}

export function MessageInput({
    onSendText,
    onAttachPress,
    onVoiceStart,
    onVoiceEnd,
    onTyping,
    onStopTyping,
}: MessageInputProps) {
    const { invertColors } = useInvertColors();
    const [text, setText] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const textColor = invertColors ? "#000" : "#fff";
    const dimColor = invertColors ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)";
    const borderColor = invertColors ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)";
    const inputBg = invertColors ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";

    const handleTextChange = useCallback(
        (val: string) => {
            setText(val);
            if (val.length > 0) {
                onTyping();
                if (typingTimer.current) clearTimeout(typingTimer.current);
                typingTimer.current = setTimeout(() => {
                    onStopTyping();
                }, 3000);
            } else {
                onStopTyping();
            }
        },
        [onTyping, onStopTyping]
    );

    const handleSend = useCallback(() => {
        const trimmed = text.trim();
        if (!trimmed) return;
        onSendText(trimmed);
        setText("");
        if (typingTimer.current) clearTimeout(typingTimer.current);
        onStopTyping();
    }, [text, onSendText, onStopTyping]);

    const handleVoicePress = useCallback(() => {
        if (isRecording) {
            setIsRecording(false);
            onVoiceEnd();
        } else {
            setIsRecording(true);
            onVoiceStart();
        }
    }, [isRecording, onVoiceStart, onVoiceEnd]);

    const hasText = text.trim().length > 0;

    return (
        <View style={[styles.container, { borderTopColor: borderColor }]}>
            <HapticPressable onPress={onAttachPress} style={styles.iconButton}>
                <MaterialIcons name="attach-file" size={n(22)} color={dimColor} />
            </HapticPressable>

            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
                <TextInput
                    style={[styles.input, { color: textColor }]}
                    value={text}
                    onChangeText={handleTextChange}
                    placeholder="Message"
                    placeholderTextColor={dimColor}
                    multiline
                    maxLength={4096}
                />
            </View>

            {hasText ? (
                <HapticPressable onPress={handleSend} style={styles.iconButton}>
                    <MaterialIcons name="send" size={n(22)} color={textColor} />
                </HapticPressable>
            ) : (
                <HapticPressable
                    onPress={handleVoicePress}
                    style={styles.iconButton}
                >
                    <MaterialIcons
                        name={isRecording ? "stop" : "mic"}
                        size={n(22)}
                        color={isRecording ? "#f44" : textColor}
                    />
                </HapticPressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: n(8),
        paddingVertical: n(8),
        borderTopWidth: 1,
        gap: n(4),
    },
    iconButton: {
        padding: n(8),
        justifyContent: "center",
        alignItems: "center",
    },
    inputWrapper: {
        flex: 1,
        borderRadius: n(20),
        borderWidth: 1,
        paddingHorizontal: n(14),
        paddingVertical: n(6),
        maxHeight: n(120),
    },
    input: {
        fontSize: n(16),
        fontFamily: "PublicSans-Regular",
        minHeight: n(24),
        paddingVertical: 0,
    },
});
