import React, { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Header } from "@/components/Header";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageInput } from "@/components/MessageInput";
import { DateSeparator } from "@/components/DateSeparator";
import { TypingIndicator } from "@/components/TypingIndicator";
import { CenteredMessage } from "@/components/CenteredMessage";
import { StyledText } from "@/components/StyledText";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useMessages } from "@/contexts/MessagesContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useChats } from "@/contexts/ChatsContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { isSameDay, formatDateSeparator } from "@/utils/format";
import type { MessageInfo } from "@/utils/types";
import { n } from "@/utils/scaling";

type ListItem =
    | { kind: "date"; key: string; label: string }
    | { kind: "message"; key: string; data: MessageInfo };

export default function ChatScreen() {
    const { id: chatId, name: chatName } = useLocalSearchParams<{ id: string; name: string }>();
    const { invertColors } = useInvertColors();
    const { getMessages, fetchMessages, sendText, sendImage, sendVoice, markAsRead } = useMessages();
    const { getPresence, subscribePresence } = useContacts();
    const { getChat } = useChats();
    const { send } = useWebSocket();

    const listRef = useRef<FlatList>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const lastReadId = useRef<string | null>(null);
    const lastBottomId = useRef<string | null>(null);

    const messages = getMessages(chatId);
    const presence = getPresence(chatId);
    const chat = getChat(chatId);
    const isGroup = chat?.isGroup ?? false;

    const isTyping = presence?.status === "composing";
    const isRecording = presence?.status === "recording";

    useEffect(() => {
        fetchMessages(chatId);
        subscribePresence(chatId);
    }, [chatId, fetchMessages, subscribePresence]);

    // Mark newly-seen incoming messages as read.
    useEffect(() => {
        const incoming = messages.filter((m) => !m.fromMe);
        const newest = incoming[incoming.length - 1];
        if (newest && newest.id !== lastReadId.current) {
            lastReadId.current = newest.id;
            markAsRead(
                chatId,
                incoming.slice(-15).map((m) => m.id),
            );
        }
    }, [messages, chatId, markAsRead]);

    // Auto-scroll to the bottom only when a *new* message lands there (or on
    // first load) — never when older history is prepended at the top.
    useEffect(() => {
        const newest = messages[messages.length - 1]?.id ?? null;
        if (newest && newest !== lastBottomId.current) {
            lastBottomId.current = newest;
            requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
        }
    }, [messages]);

    const listData = useMemo<ListItem[]>(() => {
        const items: ListItem[] = [];
        let lastTs = 0;
        for (const msg of messages) {
            if (!isSameDay(lastTs, msg.timestamp)) {
                items.push({ kind: "date", key: `date-${msg.id}`, label: formatDateSeparator(msg.timestamp) });
            }
            lastTs = msg.timestamp;
            items.push({ kind: "message", key: msg.id, data: msg });
        }
        return items;
    }, [messages]);

    const handleSendText = useCallback((text: string) => sendText(chatId, text), [chatId, sendText]);
    const handleSendVoice = useCallback((b64: string) => sendVoice(chatId, b64), [chatId, sendVoice]);

    const handleAttach = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.7,
            base64: true,
        });
        const asset = result.assets?.[0];
        if (!result.canceled && asset?.base64) {
            sendImage(chatId, asset.base64, undefined, asset.mimeType);
        }
    }, [chatId, sendImage]);

    const setPresence = useCallback(
        (type: "composing" | "recording" | "paused") => send("presence:set", { chatId, type }),
        [chatId, send],
    );

    const handleLoadMore = useCallback(async () => {
        if (loadingMore || messages.length === 0) return;
        setLoadingMore(true);
        await fetchMessages(chatId, messages[0].id);
        setLoadingMore(false);
    }, [loadingMore, messages, chatId, fetchMessages]);

    const renderItem = useCallback(
        ({ item }: { item: ListItem }) => {
            if (item.kind === "date") return <DateSeparator label={item.label} />;
            return <MessageBubble message={item.data} showSender={isGroup} />;
        },
        [isGroup],
    );

    const bg = invertColors ? "white" : "black";
    const dim = invertColors ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
    const subtitle = isTyping ? "typing…" : isRecording ? "recording…" : presence?.status === "available" ? "online" : undefined;

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: bg }]}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <Header headerTitle={chatName || "Chat"} onBackPress={() => router.back()} />
            {subtitle && (
                <View style={styles.subtitle}>
                    <StyledText style={[styles.subtitleText, { color: dim }]}>{subtitle}</StyledText>
                </View>
            )}

            {listData.length === 0 ? (
                <CenteredMessage message="No messages yet" hint="Say hello 👋" />
            ) : (
                <FlatList
                    ref={listRef}
                    data={listData}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.key}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    onStartReached={handleLoadMore}
                    onStartReachedThreshold={0.2}
                    maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                    ListFooterComponent={isTyping || isRecording ? <TypingIndicator /> : null}
                />
            )}

            <MessageInput
                onSendText={handleSendText}
                onAttachPress={handleAttach}
                onSendVoice={handleSendVoice}
                onTyping={() => setPresence("composing")}
                onStopTyping={() => setPresence("paused")}
                onRecordingChange={(rec) => setPresence(rec ? "recording" : "paused")}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    subtitle: { alignItems: "center", paddingBottom: n(4) },
    subtitleText: { fontSize: n(13) },
    list: { flex: 1 },
    listContent: { paddingVertical: n(8) },
});
