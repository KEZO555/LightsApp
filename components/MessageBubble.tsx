import React, { memo } from "react";
import { View, StyleSheet, Image } from "react-native";
import { StyledText } from "./StyledText";
import { HapticPressable } from "./HapticPressable";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";
import { formatMessageTime, formatDuration } from "@/utils/messages";
import { MaterialIcons } from "@expo/vector-icons";

interface MessageBubbleProps {
    id: string;
    fromMe: boolean;
    text?: string;
    caption?: string;
    type: string;
    timestamp: number;
    status?: "pending" | "sent" | "delivered" | "read";
    senderName?: string;
    showSender?: boolean;
    mediaDuration?: number;
    mediaUrl?: string;
    quotedMessage?: {
        text?: string;
        senderName: string;
        type: string;
    };
    onImagePress?: () => void;
    onVoicePress?: () => void;
    isPlaying?: boolean;
}

export const MessageBubble = memo(function MessageBubble({
    fromMe,
    text,
    caption,
    type,
    timestamp,
    status,
    senderName,
    showSender,
    mediaDuration,
    mediaUrl,
    quotedMessage,
    onImagePress,
    onVoicePress,
    isPlaying,
}: MessageBubbleProps) {
    const { invertColors } = useInvertColors();

    const bubbleBg = fromMe
        ? invertColors ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)"
        : invertColors ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.06)";

    const textColor = invertColors ? "#000" : "#fff";
    const dimColor = invertColors ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)";
    const accentColor = invertColors ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)";

    const renderStatus = () => {
        if (!fromMe || !status) return null;
        let iconName: keyof typeof MaterialIcons.glyphMap = "schedule";
        if (status === "sent") iconName = "check";
        else if (status === "delivered") iconName = "done-all";
        else if (status === "read") iconName = "done-all";

        return (
            <MaterialIcons
                name={iconName}
                size={n(13)}
                color={status === "read" ? accentColor : dimColor}
                style={styles.statusIcon}
            />
        );
    };

    const renderQuoted = () => {
        if (!quotedMessage) return null;
        return (
            <View style={[styles.quotedContainer, { borderLeftColor: accentColor, backgroundColor: invertColors ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }]}>
                <StyledText style={[styles.quotedSender, { color: accentColor }]} numberOfLines={1}>
                    {quotedMessage.senderName}
                </StyledText>
                <StyledText style={[styles.quotedText, { color: dimColor }]} numberOfLines={2}>
                    {quotedMessage.text || (quotedMessage.type === "image" ? "Photo" : "Media")}
                </StyledText>
            </View>
        );
    };

    const renderContent = () => {
        switch (type) {
            case "image":
                return (
                    <View>
                        {mediaUrl ? (
                            <HapticPressable onPress={onImagePress}>
                                <Image
                                    source={{ uri: mediaUrl }}
                                    style={styles.imageContent}
                                    resizeMode="cover"
                                />
                            </HapticPressable>
                        ) : (
                            <View style={[styles.imagePlaceholder, { backgroundColor: invertColors ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" }]}>
                                <MaterialIcons name="image" size={n(32)} color={dimColor} />
                            </View>
                        )}
                        {caption ? (
                            <StyledText style={[styles.text, { color: textColor }]}>
                                {caption}
                            </StyledText>
                        ) : null}
                    </View>
                );

            case "voice":
            case "audio":
                return (
                    <HapticPressable onPress={onVoicePress}>
                        <View style={styles.voiceContainer}>
                            <MaterialIcons
                                name={isPlaying ? "pause" : "play-arrow"}
                                size={n(24)}
                                color={textColor}
                            />
                            <View style={[styles.voiceBar, { backgroundColor: accentColor }]}>
                                <View style={[styles.voiceProgress, { backgroundColor: textColor, width: isPlaying ? "50%" : "0%" }]} />
                            </View>
                            {mediaDuration !== undefined && (
                                <StyledText style={[styles.voiceDuration, { color: dimColor }]}>
                                    {formatDuration(mediaDuration)}
                                </StyledText>
                            )}
                        </View>
                    </HapticPressable>
                );

            case "document":
                return (
                    <View style={styles.documentContainer}>
                        <MaterialIcons name="description" size={n(20)} color={textColor} />
                        <StyledText style={[styles.text, { color: textColor, flex: 1 }]} numberOfLines={1}>
                            {caption || "Document"}
                        </StyledText>
                    </View>
                );

            case "sticker":
                return (
                    <StyledText style={[styles.text, { color: dimColor }]}>
                        Sticker
                    </StyledText>
                );

            case "video":
                return (
                    <View style={[styles.imagePlaceholder, { backgroundColor: invertColors ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" }]}>
                        <MaterialIcons name="play-circle-outline" size={n(40)} color={dimColor} />
                        {caption ? (
                            <StyledText style={[styles.text, { color: textColor }]}>
                                {caption}
                            </StyledText>
                        ) : null}
                    </View>
                );

            default:
                return (
                    <StyledText style={[styles.text, { color: textColor }]}>
                        {text || ""}
                    </StyledText>
                );
        }
    };

    return (
        <View style={[styles.wrapper, fromMe ? styles.wrapperRight : styles.wrapperLeft]}>
            <View style={[styles.bubble, { backgroundColor: bubbleBg, maxWidth: "85%" }]}>
                {showSender && senderName && (
                    <StyledText style={[styles.sender, { color: accentColor }]} numberOfLines={1}>
                        {senderName}
                    </StyledText>
                )}
                {renderQuoted()}
                {renderContent()}
                <View style={styles.meta}>
                    <StyledText style={[styles.time, { color: dimColor }]}>
                        {formatMessageTime(timestamp)}
                    </StyledText>
                    {renderStatus()}
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: n(12),
        paddingVertical: n(2),
    },
    wrapperLeft: {
        alignItems: "flex-start",
    },
    wrapperRight: {
        alignItems: "flex-end",
    },
    bubble: {
        borderRadius: n(12),
        paddingHorizontal: n(12),
        paddingVertical: n(8),
    },
    sender: {
        fontSize: n(13),
        fontWeight: "600",
        marginBottom: n(2),
    },
    text: {
        fontSize: n(16),
        lineHeight: n(22),
    },
    meta: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginTop: n(2),
        gap: n(3),
    },
    time: {
        fontSize: n(11),
    },
    statusIcon: {
        marginLeft: n(2),
    },
    quotedContainer: {
        borderLeftWidth: n(3),
        borderRadius: n(4),
        paddingHorizontal: n(8),
        paddingVertical: n(4),
        marginBottom: n(6),
    },
    quotedSender: {
        fontSize: n(12),
        fontWeight: "600",
    },
    quotedText: {
        fontSize: n(13),
    },
    imageContent: {
        width: n(220),
        height: n(220),
        borderRadius: n(8),
        marginBottom: n(4),
    },
    imagePlaceholder: {
        width: n(220),
        height: n(160),
        borderRadius: n(8),
        justifyContent: "center",
        alignItems: "center",
        marginBottom: n(4),
    },
    voiceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: n(8),
        minWidth: n(180),
    },
    voiceBar: {
        flex: 1,
        height: n(4),
        borderRadius: n(2),
        overflow: "hidden",
    },
    voiceProgress: {
        height: "100%",
        borderRadius: n(2),
    },
    voiceDuration: {
        fontSize: n(12),
    },
    documentContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: n(8),
    },
});
