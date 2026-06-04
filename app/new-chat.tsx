import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import ContentContainer from "@/components/ContentContainer";
import CustomScrollView from "@/components/CustomScrollView";
import { SearchInput } from "@/components/SearchInput";
import { ListItem } from "@/components/ListItem";
import { CenteredMessage } from "@/components/CenteredMessage";
import { StyledText } from "@/components/StyledText";
import { HapticPressable } from "@/components/HapticPressable";
import { useContacts } from "@/contexts/ContactsContext";
import { n } from "@/utils/scaling";

export default function NewChatScreen() {
    const { contacts, resolveNumber } = useContacts();
    const [query, setQuery] = useState("");
    const [resolving, setResolving] = useState(false);

    const digits = query.replace(/[^0-9]/g, "");
    const looksLikeNumber = digits.length >= 6;

    const filtered = useMemo(() => {
        if (!query) return contacts;
        const q = query.toLowerCase();
        return contacts.filter(
            (c) => c.name.toLowerCase().includes(q) || c.id.includes(digits),
        );
    }, [contacts, query, digits]);

    const openChat = useCallback((id: string, name: string) => {
        router.replace({ pathname: "/chat", params: { id, name } } as any);
    }, []);

    const messageNumber = useCallback(async () => {
        if (resolving) return;
        setResolving(true);
        try {
            const { jid, exists } = await resolveNumber(digits);
            if (exists) openChat(jid, `+${digits}`);
        } finally {
            setResolving(false);
        }
    }, [digits, resolveNumber, openChat, resolving]);

    return (
        <ContentContainer headerTitle="New Chat">
            <View style={styles.searchRow}>
                <SearchInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Name or number"
                    autoFocus
                />
            </View>

            {looksLikeNumber && (
                <HapticPressable onPress={messageNumber} style={styles.numberRow}>
                    <StyledText style={styles.numberText}>
                        {resolving ? "Checking…" : `Message +${digits}`}
                    </StyledText>
                </HapticPressable>
            )}

            {filtered.length === 0 ? (
                <CenteredMessage
                    message={query ? "No contacts found" : "No contacts yet"}
                    hint={query ? "Enter a full number to start a chat" : "Contacts sync after linking"}
                />
            ) : (
                <CustomScrollView
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ListItem
                            primaryText={item.name}
                            secondaryText={item.id.split("@")[0]}
                            onPress={() => openChat(item.id, item.name)}
                        />
                    )}
                />
            )}
        </ContentContainer>
    );
}

const styles = StyleSheet.create({
    searchRow: {
        width: "100%",
    },
    numberRow: {
        width: "100%",
        paddingVertical: n(6),
    },
    numberText: {
        fontSize: n(22),
        textDecorationLine: "underline",
    },
});
