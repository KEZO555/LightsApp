import React from "react";
import { View, StyleSheet, Image, Dimensions } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Header } from "@/components/Header";
import { StyledText } from "@/components/StyledText";
import { n } from "@/utils/scaling";

export default function MediaViewerScreen() {
    const { uri, caption } = useLocalSearchParams<{ uri: string; caption?: string }>();
    const { width, height } = Dimensions.get("window");

    return (
        <View style={styles.container}>
            <Header headerTitle="" onBackPress={() => router.back()} />
            <View style={styles.imageWrap}>
                {uri ? (
                    <Image
                        source={{ uri }}
                        style={{ width, height: height * 0.7 }}
                        resizeMode="contain"
                    />
                ) : null}
            </View>
            {caption ? (
                <View style={styles.captionWrap}>
                    <StyledText style={styles.caption}>{caption}</StyledText>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",
    },
    imageWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    captionWrap: {
        padding: n(16),
    },
    caption: {
        color: "white",
        fontSize: n(15),
        textAlign: "center",
    },
});
