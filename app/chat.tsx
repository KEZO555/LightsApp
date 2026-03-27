import React, { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Header } from "@/components/Header";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageInput } from "@/components/MessageInput";
import { DateSeparator } from "@/components/DateSeparator";
import { TypingIndicator } from "@/components/TypingIndicator";
import { StyledText } from "@/components/StyledText";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useMessages, type MessageInfo } from "@/contexts/MessagesContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useChats } from "@/contexts/ChatsContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { n } from "@/utils/scaling";
import { isSameDay, formatDateSeparator } from "@/utils/messages";
import * as ImagePicker from "expo-image-picker";

type ListItem =
    | { type: "date"; key: string; label: string }
    | { type: "message"; key: string; data: MessageInfo };

export default function ChatScreen() {
    const { id: chatId, name: chatName } = useLocalSearchParams<{ id: string; name: string }>();
    const { invertColors } = useInvertColors();
    const { getMessages, fetchMessages, sendTextMessage, sendImageMessage, sendVoiceMessage, markAsRead } = useMessages();
    const { getPresence } = useContacts();
    const { getChat } = useChats();
    const { send } = useWebSocket();
    const flatListRef = useRef<FlatList>(null);
    const [loading, setLoading] = useState(false);

    const messages = getMessages(chatId);
    const presence = getPresence(chatId);
    const chat = getChat(chatId);
    const isGroup = chat?.isGroup || false;

    const isTyping = presence?.status === "composing";
    const isRecording = presence?.status === "recording";

    useEffect(() => {
        fetchMessages(chatId);
    }, [chatId, fetchMessages]);

    useEffect(() => {
        if (messages.length > 0) {
            const unreadIds = messages
                .filter((m) => !m.fromMe)
                .slice(-10)
                .map((m) => m.id);
            if (unreadIds.length > 0) {
                markAsRead(chatId, unreadIds);
            }
        }
    }, [messages.length, chatId, markAsRead]);

    const listData = useMemo<ListItem[]>(() => {
        const items: ListItem[] = [];
        let lastTs = 0;
        for (const msg of messages) {
            if (!isSameDay(lastTs, msg.timestamp)) {
                items.push({
                    type: "date",
                    key: `date-${msg.timestamp}`,
                    label: formatDateSeparator(msg.timestamp),
                });
            }
            lastTs = msg.timestamp;
            items.push({ type: "message", key: msg.id, data: msg });
        }
        return items;
    }, [messages]);

    const handleSendText = useCallback(
        (text: string) => {
            sendTextMessage(chatId, text);
        },
        [chatId, sendTextMessage]
    );

    const handleAttach = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.7,
            base64: true,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        if (asset.base64) {
            sendImageMessage(chatId, asset.base64, undefined, asset.mimeType);
        }
    }, [chatId, sendImageMessage]);

    const handleVoiceStart = useCallback(() => {
        send("typing:update", { chatId, type: "recording" });
    }, [chatId, send]);

    const handleVoiceEnd = useCallback(() => {
        send("typing:update", { chatId, type: "paused" });
    }, [chatId, send]);

    const handleTyping = useCallback(() => {
        send("typing:update", { chatId, type: "composing" });
    }, [chatId, send]);

    const handleStopTyping = useCallback(() => {
        send("typing:update", { chatId, type: "paused" });
    }, [chatId, send]);

    const handleLoadMore = useCallback(async () => {
        if (loading || messages.length === 0) return;
        setLoading(true);
        await fetchMessages(chatId, messages[0]?.id);
        setLoading(false);
    }, [loading, messages, chatId, fetchMessages]);

    const subtitleText = isTyping
        ? "typing..."
        : isRecording
            ? "recording..."
            : presence?.status === "available"
                ? "online"
                : undefined;

    const bgColor = invertColors ? "white" : "black";
    const dimColor = invertColors ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";

    const renderItem = useCallback(
        ({ item }: { item: ListItem }) => {
            if (item.type === "date") {
                return <DateSeparator label={item.label} />;
            }
            const msg = item.data;
            return (
                <MessageBubble
                    id={msg.id}
                    fromMe={msg.fromMe}
                    text={msg.text}
                    caption={msg.caption}
                    type={msg.type}
                    timestamp={msg.timestamp}
                    status={msg.status}
                    senderName={msg.senderName}
                    showSender={isGroup && !msg.fromMe}
                    mediaDuration={msg.mediaDuration}
                    mediaUrl={msg.mediaUrl}
                    quotedMessage={msg.quotedMessage}
                />
            );
        },
        [isGroup]
    );

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: bgColor }]}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
        >
            <Header
                headerTitle={chatName || "Chat"}
                onBackPress={() => router.back()}
            />
            {subtitleText && (
                <View style={styles.subtitle}>
                    <StyledText style={[styles.subtitleText, { color: dimColor }]}>
                        {subtitleText}
                    </StyledText>
                </View>
            )}
            <FlatList
                ref={flatListRef}
                data={listData}
                renderItem={renderItem}
                keyExtractor={(item) => item.key}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                onEndReachedThreshold={0.1}
                inverted={false}
                onContentSizeChange={() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                }}
                ListFooterComponent={
                    (isTyping || isRecording) ? <TypingIndicator /> : null
                }
            />
            <MessageInput
                onSendText={handleSendText}
                onAttachPress={handleAttach}
                onVoiceStart={handleVoiceStart}
                onVoiceEnd={handleVoiceEnd}
                onTyping={handleTyping}
                onStopTyping={handleStopTyping}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    subtitle: {
        alignItems: "center",
        paddingBottom: n(4),
    },
    subtitleText: {
        fontSize: n(13),
    },
    messagesList: {
        flex: 1,
    },
    messagesContent: {
        paddingVertical: n(8),
    },
});
