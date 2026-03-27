import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { StyledText } from "./StyledText";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

interface DateSeparatorProps {
    label: string;
}

export const DateSeparator = memo(function DateSeparator({ label }: DateSeparatorProps) {
    const { invertColors } = useInvertColors();
    const bgColor = invertColors ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
    const textColor = invertColors ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";

    return (
        <View style={styles.container}>
            <View style={[styles.pill, { backgroundColor: bgColor }]}>
                <StyledText style={[styles.text, { color: textColor }]}>{label}</StyledText>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        paddingVertical: n(10),
    },
    pill: {
        paddingHorizontal: n(14),
        paddingVertical: n(4),
        borderRadius: n(12),
    },
    text: {
        fontSize: n(12),
    },
});
