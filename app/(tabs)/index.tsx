import { useCallback, useState, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import ContentContainer from "@/components/ContentContainer";
import CustomScrollView from "@/components/CustomScrollView";
import { ChatListItem } from "@/components/ChatListItem";
import { CenteredMessage } from "@/components/CenteredMessage";
import { SearchInput } from "@/components/SearchInput";
import { useChats } from "@/contexts/ChatsContext";
import { useConnection } from "@/contexts/ConnectionContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { n } from "@/utils/scaling";

export default function ChatsScreen() {
    const { chats } = useChats();
    const { waStatus } = useConnection();
    const { wsState } = useWebSocket();
    const [search, setSearch] = useState("");

    const filteredChats = useMemo(() => {
        if (!search) return chats.filter((c) => !c.archived);
        const q = search.toLowerCase();
        return chats.filter(
            (c) => !c.archived && c.name.toLowerCase().includes(q)
        );
    }, [chats, search]);

    const handleChatPress = useCallback((chatId: string, chatName: string) => {
        router.push({ pathname: "/chat", params: { id: chatId, name: chatName } } as any);
    }, []);

    const handleNewChat = useCallback(() => {
        router.push("/new-chat" as any);
    }, []);

    const isConnected = wsState === "connected" && waStatus.state === "connected";
    const needsSetup = waStatus.state === "qr" || waStatus.state === "disconnected";

    const headerTitle = isConnected
        ? "Chats"
        : wsState !== "connected"
            ? "Connecting..."
            : waStatus.state === "qr"
                ? "Scan QR"
                : "Chats";

    if (needsSetup && chats.length === 0) {
        return (
            <ContentContainer
                headerTitle="LightsApp"
                hideBackButton
                rightIcon="qr-code-2"
                onRightIconPress={() => router.push("/qr-setup" as any)}
            >
                <CenteredMessage
                    message={wsState !== "connected" ? "Not connected to server" : "WhatsApp not linked"}
                    hint={wsState !== "connected" ? "Configure server in Settings" : "Tap QR icon to link your WhatsApp"}
                />
            </ContentContainer>
        );
    }

    return (
        <ContentContainer
            headerTitle={headerTitle}
            hideBackButton
            rightIcon="edit"
            onRightIconPress={handleNewChat}
        >
            {chats.length > 5 && (
                <View style={styles.searchContainer}>
                    <SearchInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search chats..."
                    />
                </View>
            )}
            {filteredChats.length === 0 ? (
                <CenteredMessage
                    message={search ? "No chats found" : "No conversations yet"}
                    hint={search ? "Try a different search" : "Start a new chat"}
                />
            ) : (
                <CustomScrollView
                    data={filteredChats}
                    renderItem={({ item }) => (
                        <ChatListItem
                            name={item.name}
                            isGroup={item.isGroup}
                            lastMessage={item.lastMessage}
                            timestamp={item.timestamp}
                            unreadCount={item.unreadCount}
                            muted={item.muted}
                            onPress={() => handleChatPress(item.id, item.name)}
                        />
                    )}
                    keyExtractor={(item) => item.id}
                />
            )}
        </ContentContainer>
    );
}

const styles = StyleSheet.create({
    searchContainer: {
        paddingHorizontal: n(20),
        paddingBottom: n(8),
    },
});
