import React, { memo, useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, Image, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { router } from "expo-router";
import { StyledText } from "@/components/StyledText";
import { HapticPressable } from "@/components/HapticPressable";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useServerConfig } from "@/contexts/ServerConfigContext";
import { formatTime, formatDuration } from "@/utils/format";
import type { MessageInfo, MessageStatus } from "@/utils/types";
import { n } from "@/utils/scaling";

interface MessageBubbleProps {
    message: MessageInfo;
    showSender: boolean;
}

function StatusTick({ status, color }: { status?: MessageStatus; color: string }) {
    if (!status) return null;
    const icon =
        status === "pending"
            ? "schedule"
            : status === "sent"
                ? "check"
                : "done-all";
    return <MaterialIcons name={icon} size={n(14)} color={color} style={{ marginLeft: n(3) }} />;
}

export const MessageBubble = memo(function MessageBubble({
    message,
    showSender,
}: MessageBubbleProps) {
    const { invertColors } = useInvertColors();
    const { httpUrl } = useServerConfig();
    const fromMe = message.fromMe;

    const fg = invertColors ? "black" : "white";
    const dim = invertColors ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
    const borderColor = invertColors ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)";
    // Sent messages get a subtle filled background; received are outlined.
    const bubbleBg = fromMe
        ? invertColors
            ? "rgba(0,0,0,0.08)"
            : "rgba(255,255,255,0.12)"
        : "transparent";

    const mediaSrc = message.mediaUrl ? `${httpUrl}${message.mediaUrl}` : undefined;

    const openMedia = useCallback(() => {
        if (mediaSrc) {
            router.push({
                pathname: "/media-viewer",
                params: { uri: mediaSrc, caption: message.caption ?? "" },
            } as any);
        }
    }, [mediaSrc, message.caption]);

    return (
        <View style={[styles.row, fromMe ? styles.rowMe : styles.rowOther]}>
            <View
                style={[
                    styles.bubble,
                    { borderColor, backgroundColor: bubbleBg },
                    fromMe ? styles.bubbleMe : styles.bubbleOther,
                ]}
            >
                {showSender && !fromMe && (
                    <StyledText style={[styles.sender, { color: fg }]} numberOfLines={1}>
                        {message.senderName}
                    </StyledText>
                )}

                {message.isForwarded && (
                    <View style={styles.forwarded}>
                        <MaterialIcons name="forward" size={n(13)} color={dim} />
                        <StyledText style={[styles.forwardedText, { color: dim }]}>
                            Forwarded
                        </StyledText>
                    </View>
                )}

                {message.quotedMessage && (
                    <View style={[styles.quoted, { borderLeftColor: fg }]}>
                        <StyledText style={[styles.quotedName, { color: fg }]} numberOfLines={1}>
                            {message.quotedMessage.senderName}
                        </StyledText>
                        <StyledText style={[styles.quotedText, { color: dim }]} numberOfLines={1}>
                            {message.quotedMessage.text || message.quotedMessage.type}
                        </StyledText>
                    </View>
                )}

                <BubbleContent message={message} mediaSrc={mediaSrc} fg={fg} dim={dim} onOpenMedia={openMedia} />

                <View style={styles.metaRow}>
                    <StyledText style={[styles.time, { color: dim }]}>
                        {formatTime(message.timestamp)}
                    </StyledText>
                    {fromMe && <StatusTick status={message.status} color={dim} />}
                </View>
            </View>
        </View>
    );
});

function BubbleContent({
    message,
    mediaSrc,
    fg,
    dim,
    onOpenMedia,
}: {
    message: MessageInfo;
    mediaSrc?: string;
    fg: string;
    dim: string;
    onOpenMedia: () => void;
}) {
    switch (message.type) {
        case "text":
        case "location":
            return <StyledText style={styles.text}>{message.text || ""}</StyledText>;

        case "image":
        case "video":
        case "sticker": {
            const thumb = message.thumbnail
                ? { uri: message.thumbnail }
                : mediaSrc
                    ? { uri: mediaSrc }
                    : undefined;
            return (
                <HapticPressable onPress={onOpenMedia}>
                    {thumb ? (
                        <View>
                            <Image source={thumb} style={styles.image} resizeMode="cover" />
                            {message.type === "video" && (
                                <View style={styles.playOverlay}>
                                    <MaterialIcons name="play-circle-outline" size={n(48)} color="white" />
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={[styles.image, styles.imagePlaceholder]}>
                            <MaterialIcons name="image" size={n(40)} color={dim} />
                        </View>
                    )}
                    {message.caption ? (
                        <StyledText style={[styles.text, { marginTop: n(6) }]}>
                            {message.caption}
                        </StyledText>
                    ) : null}
                </HapticPressable>
            );
        }

        case "voice":
        case "audio":
            return <VoiceContent uri={mediaSrc} duration={message.mediaDuration} fg={fg} dim={dim} />;

        case "document":
            return (
                <HapticPressable onPress={onOpenMedia} style={styles.docRow}>
                    <MaterialIcons name="insert-drive-file" size={n(28)} color={fg} />
                    <StyledText style={[styles.text, styles.docName]} numberOfLines={2}>
                        {message.caption || "Document"}
                    </StyledText>
                </HapticPressable>
            );

        default:
            return (
                <StyledText style={[styles.text, { color: dim }]}>
                    Unsupported message
                </StyledText>
            );
    }
}

function VoiceContent({
    uri,
    duration,
    fg,
    dim,
}: {
    uri?: string;
    duration?: number;
    fg: string;
    dim: string;
}) {
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const soundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        return () => {
            soundRef.current?.unloadAsync();
            soundRef.current = null;
        };
    }, []);

    const toggle = useCallback(async () => {
        if (!uri) return;
        try {
            if (soundRef.current) {
                if (playing) {
                    await soundRef.current.pauseAsync();
                    setPlaying(false);
                } else {
                    await soundRef.current.playAsync();
                    setPlaying(true);
                }
                return;
            }
            setLoading(true);
            const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
            soundRef.current = sound;
            setLoading(false);
            setPlaying(true);
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setPlaying(false);
                    sound.setPositionAsync(0);
                }
            });
        } catch (e) {
            console.warn("[Voice] playback failed:", e);
            setLoading(false);
        }
    }, [uri, playing]);

    return (
        <HapticPressable onPress={toggle} style={styles.voiceRow}>
            {loading ? (
                <ActivityIndicator size="small" color={fg} />
            ) : (
                <MaterialIcons name={playing ? "pause" : "play-arrow"} size={n(28)} color={fg} />
            )}
            <MaterialIcons name="graphic-eq" size={n(22)} color={dim} />
            <StyledText style={[styles.voiceDuration, { color: dim }]}>
                {formatDuration(duration)}
            </StyledText>
        </HapticPressable>
    );
}

const styles = StyleSheet.create({
    row: {
        width: "100%",
        paddingHorizontal: n(14),
        marginVertical: n(3),
    },
    rowMe: { alignItems: "flex-end" },
    rowOther: { alignItems: "flex-start" },
    bubble: {
        maxWidth: "82%",
        borderWidth: n(1),
        borderRadius: n(14),
        paddingHorizontal: n(11),
        paddingVertical: n(7),
    },
    bubbleMe: { borderBottomRightRadius: n(3) },
    bubbleOther: { borderBottomLeftRadius: n(3) },
    sender: {
        fontSize: n(13),
        fontWeight: "700",
        marginBottom: n(2),
    },
    forwarded: {
        flexDirection: "row",
        alignItems: "center",
        gap: n(3),
        marginBottom: n(2),
    },
    forwardedText: {
        fontSize: n(12),
        fontStyle: "italic",
    },
    quoted: {
        borderLeftWidth: n(2),
        paddingLeft: n(6),
        marginBottom: n(4),
        gap: n(1),
    },
    quotedName: { fontSize: n(12), fontWeight: "700" },
    quotedText: { fontSize: n(12) },
    text: {
        fontSize: n(16),
        lineHeight: n(21),
    },
    image: {
        width: n(200),
        height: n(200),
        borderRadius: n(8),
    },
    imagePlaceholder: {
        alignItems: "center",
        justifyContent: "center",
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
    voiceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: n(8),
        paddingVertical: n(2),
        minWidth: n(140),
    },
    voiceDuration: { fontSize: n(13) },
    docRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: n(8),
        minWidth: n(140),
    },
    docName: { flexShrink: 1 },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginTop: n(2),
    },
    time: { fontSize: n(11) },
});
