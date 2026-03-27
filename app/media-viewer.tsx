import React from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Header } from "@/components/Header";
import { useInvertColors } from "@/contexts/InvertColorsContext";

const { width, height } = Dimensions.get("window");

export default function MediaViewerScreen() {
    const { uri, title } = useLocalSearchParams<{ uri: string; title?: string }>();
    const { invertColors } = useInvertColors();

    return (
        <View style={[styles.container, { backgroundColor: invertColors ? "white" : "black" }]}>
            <Header headerTitle={title || "Photo"} onBackPress={() => router.back()} />
            <View style={styles.imageContainer}>
                {uri && (
                    <Image
                        source={{ uri }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    imageContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: width,
        height: height * 0.8,
    },
});
