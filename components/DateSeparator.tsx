import React from "react";
import { View, StyleSheet } from "react-native";
import { StyledText } from "@/components/StyledText";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

export function DateSeparator({ label }: { label: string }) {
    const { invertColors } = useInvertColors();
    const color = invertColors ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)";
    const border = invertColors ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.25)";

    return (
        <View style={styles.container}>
            <View style={[styles.pill, { borderColor: border }]}>
                <StyledText style={[styles.label, { color }]}>{label}</StyledText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        marginVertical: n(8),
    },
    pill: {
        borderWidth: n(1),
        borderRadius: n(12),
        paddingHorizontal: n(12),
        paddingVertical: n(3),
    },
    label: {
        fontSize: n(12),
    },
});
