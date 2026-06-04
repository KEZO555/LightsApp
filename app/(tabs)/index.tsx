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

    const visibleChats = useMemo(() => {
        const active = chats.filter((c) => !c.archived);
        if (!search) return active;
        const q = search.toLowerCase();
        return active.filter((c) => c.name.toLowerCase().includes(q));
    }, [chats, search]);

    const openChat = useCallback((id: string, name: string) => {
        router.push({ pathname: "/chat", params: { id, name } } as any);
    }, []);

    const serverOffline = wsState !== "connected";
    const needsLink = !serverOffline && waStatus.state !== "connected";

    // Onboarding state: nothing to show yet.
    if ((serverOffline || needsLink) && chats.length === 0) {
        return (
            <ContentContainer
                headerTitle="LightsApp"
                hideBackButton
                rightIcon="qr-code-2"
                onRightIconPress={() => router.push("/qr-setup" as any)}
            >
                <CenteredMessage
                    message={serverOffline ? "Not connected to server" : "WhatsApp not linked"}
                    hint={
                        serverOffline
                            ? "Set your bridge address in Settings"
                            : "Tap the QR icon to link your phone"
                    }
                />
            </ContentContainer>
        );
    }

    const title = serverOffline
        ? "Connecting…"
        : waStatus.state === "qr"
            ? "Scan QR"
            : waStatus.state !== "connected"
                ? "Linking…"
                : "Chats";

    return (
        <ContentContainer
            headerTitle={title}
            hideBackButton
            rightIcon="edit"
            onRightIconPress={() => router.push("/new-chat" as any)}
        >
            {chats.length > 6 && (
                <View style={styles.searchContainer}>
                    <SearchInput value={search} onChangeText={setSearch} placeholder="Search" />
                </View>
            )}
            {visibleChats.length === 0 ? (
                <CenteredMessage
                    message={search ? "No chats found" : "No conversations yet"}
                    hint={search ? "Try another search" : "Tap edit to start one"}
                />
            ) : (
                <CustomScrollView
                    data={visibleChats}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ChatListItem
                            name={item.name}
                            isGroup={item.isGroup}
                            lastMessage={item.lastMessage}
                            timestamp={item.timestamp}
                            unreadCount={item.unreadCount}
                            muted={item.muted}
                            onPress={() => openChat(item.id, item.name)}
                        />
                    )}
                />
            )}
        </ContentContainer>
    );
}

const styles = StyleSheet.create({
    searchContainer: {
        width: "100%",
        paddingBottom: n(8),
    },
});
