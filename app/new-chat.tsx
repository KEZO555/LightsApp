import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import ContentContainer from "@/components/ContentContainer";
import CustomScrollView from "@/components/CustomScrollView";
import { SearchInput } from "@/components/SearchInput";
import { ListItem } from "@/components/ListItem";
import { CenteredMessage } from "@/components/CenteredMessage";
import { useContacts } from "@/contexts/ContactsContext";
import { n } from "@/utils/scaling";

export default function NewChatScreen() {
    const { contacts } = useContacts();
    const [search, setSearch] = useState("");

    const filteredContacts = useMemo(() => {
        const nonGroup = contacts.filter((c) => !c.isGroup);
        if (!search) return nonGroup.sort((a, b) => a.name.localeCompare(b.name));
        const q = search.toLowerCase();
        return nonGroup
            .filter((c) => c.name.toLowerCase().includes(q))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [contacts, search]);

    const handleContactPress = useCallback((contactId: string, contactName: string) => {
        router.replace({ pathname: "/chat", params: { id: contactId, name: contactName } } as any);
    }, []);

    return (
        <ContentContainer headerTitle="New Chat">
            <View style={styles.searchContainer}>
                <SearchInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search contacts..."
                    autoFocus
                />
            </View>
            {filteredContacts.length === 0 ? (
                <CenteredMessage
                    message="No contacts found"
                    hint={search ? "Try a different search" : "Contacts will appear after connecting to WhatsApp"}
                />
            ) : (
                <CustomScrollView
                    data={filteredContacts}
                    renderItem={({ item }) => (
                        <ListItem
                            primaryText={item.name}
                            secondaryText={item.id.split("@")[0]}
                            onPress={() => handleContactPress(item.id, item.name)}
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
