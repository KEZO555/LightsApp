import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { StyledText } from "./StyledText";
import { HapticPressable } from "./HapticPressable";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";
import { formatTimestamp, getMessagePreview } from "@/utils/messages";

interface ChatListItemProps {
    name: string;
    isGroup: boolean;
    lastMessage: {
        type: string;
        text?: string;
        caption?: string;
        fromMe: boolean;
        senderName?: string;
    } | null;
    timestamp: number;
    unreadCount: number;
    muted: boolean;
    onPress: () => void;
}

export const ChatListItem = memo(function ChatListItem({
    name,
    isGroup,
    lastMessage,
    timestamp,
    unreadCount,
    muted,
    onPress,
}: ChatListItemProps) {
    const { invertColors } = useInvertColors();
    const textColor = invertColors ? "#000" : "#fff";
    const dimColor = invertColors ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
    const borderColor = invertColors ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

    let preview = "";
    if (lastMessage) {
        const msgText = getMessagePreview(lastMessage);
        if (isGroup && !lastMessage.fromMe && lastMessage.senderName) {
            preview = `${lastMessage.senderName}: ${msgText}`;
        } else if (lastMessage.fromMe) {
            preview = `You: ${msgText}`;
        } else {
            preview = msgText;
        }
    }

    return (
        <HapticPressable onPress={onPress}>
            <View style={[styles.container, { borderBottomColor: borderColor }]}>
                <View style={styles.content}>
                    <View style={styles.topRow}>
                        <StyledText style={[styles.name, { color: textColor }]} numberOfLines={1}>
                            {name}
                        </StyledText>
                        <StyledText style={[styles.time, { color: unreadCount > 0 ? textColor : dimColor }]}>
                            {timestamp > 0 ? formatTimestamp(timestamp) : ""}
                        </StyledText>
                    </View>
                    <View style={styles.bottomRow}>
                        <StyledText
                            style={[styles.preview, { color: dimColor }]}
                            numberOfLines={1}
                        >
                            {preview || " "}
                        </StyledText>
                        {unreadCount > 0 && (
                            <View style={[styles.badge, { backgroundColor: textColor }]}>
                                <StyledText
                                    style={[
                                        styles.badgeText,
                                        { color: invertColors ? "#fff" : "#000" },
                                    ]}
                                >
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </StyledText>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </HapticPressable>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingVertical: n(14),
        paddingHorizontal: n(20),
        borderBottomWidth: 1,
    },
    content: {
        gap: n(4),
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    name: {
        fontSize: n(18),
        flex: 1,
        marginRight: n(8),
    },
    time: {
        fontSize: n(13),
    },
    preview: {
        fontSize: n(15),
        flex: 1,
        marginRight: n(8),
    },
    badge: {
        minWidth: n(20),
        height: n(20),
        borderRadius: n(10),
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: n(6),
    },
    badgeText: {
        fontSize: n(11),
        fontWeight: "bold",
    },
});
