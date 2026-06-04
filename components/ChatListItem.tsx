import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { StyledText } from "@/components/StyledText";
import { HapticPressable } from "@/components/HapticPressable";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { formatChatTimestamp, messagePreview } from "@/utils/format";
import type { MessageInfo } from "@/utils/types";
import { n } from "@/utils/scaling";

interface ChatListItemProps {
    name: string;
    isGroup: boolean;
    lastMessage: MessageInfo | null;
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
    const fg = invertColors ? "black" : "white";
    const dim = invertColors ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)";
    const hasUnread = unreadCount > 0;

    const prefix =
        lastMessage && lastMessage.fromMe ? "You: " : isGroup && lastMessage ? `${lastMessage.senderName}: ` : "";
    const preview = lastMessage ? `${prefix}${messagePreview(lastMessage)}` : "";

    return (
        <HapticPressable onPress={onPress} style={styles.container}>
            <View style={styles.textBlock}>
                <View style={styles.topRow}>
                    {isGroup && (
                        <MaterialIcons
                            name="group"
                            size={n(18)}
                            color={fg}
                            style={styles.groupIcon}
                        />
                    )}
                    <StyledText
                        style={[styles.name, hasUnread && styles.bold]}
                        numberOfLines={1}
                    >
                        {name}
                    </StyledText>
                </View>
                <StyledText
                    style={[styles.preview, { color: hasUnread ? fg : dim }]}
                    numberOfLines={1}
                >
                    {preview}
                </StyledText>
            </View>
            <View style={styles.meta}>
                <StyledText style={[styles.time, { color: hasUnread ? fg : dim }]}>
                    {formatChatTimestamp(timestamp)}
                </StyledText>
                <View style={styles.metaIcons}>
                    {muted && (
                        <MaterialIcons name="notifications-off" size={n(15)} color={dim} />
                    )}
                    {hasUnread && (
                        <View style={[styles.badge, { backgroundColor: fg }]}>
                            <StyledText
                                style={[
                                    styles.badgeText,
                                    { color: invertColors ? "white" : "black" },
                                ]}
                            >
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </StyledText>
                        </View>
                    )}
                </View>
            </View>
        </HapticPressable>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: n(10),
        gap: n(10),
    },
    textBlock: {
        flex: 1,
        gap: n(3),
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: n(5),
    },
    groupIcon: {
        marginTop: n(1),
    },
    name: {
        fontSize: n(20),
        flexShrink: 1,
    },
    bold: {
        fontWeight: "700",
    },
    preview: {
        fontSize: n(15),
    },
    meta: {
        alignItems: "flex-end",
        gap: n(5),
    },
    time: {
        fontSize: n(13),
    },
    metaIcons: {
        flexDirection: "row",
        alignItems: "center",
        gap: n(5),
        minHeight: n(20),
    },
    badge: {
        minWidth: n(20),
        height: n(20),
        borderRadius: n(10),
        paddingHorizontal: n(6),
        alignItems: "center",
        justifyContent: "center",
    },
    badgeText: {
        fontSize: n(12),
        fontWeight: "700",
    },
});
