import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

/** Three pulsing dots shown at the bottom of a chat while the peer types. */
export function TypingIndicator() {
    const { invertColors } = useInvertColors();
    const color = invertColors ? "black" : "white";
    const border = invertColors ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)";
    const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

    useEffect(() => {
        const animations = dots.map((dot, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 150),
                    Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0.3, duration: 350, useNativeDriver: true }),
                ]),
            ),
        );
        animations.forEach((a) => a.start());
        return () => animations.forEach((a) => a.stop());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={styles.row}>
            <View style={[styles.bubble, { borderColor: border }]}>
                {dots.map((dot, i) => (
                    <Animated.View
                        key={i}
                        style={[styles.dot, { backgroundColor: color, opacity: dot }]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        paddingHorizontal: n(14),
        marginVertical: n(3),
        alignItems: "flex-start",
    },
    bubble: {
        flexDirection: "row",
        gap: n(4),
        borderWidth: n(1),
        borderRadius: n(14),
        borderBottomLeftRadius: n(3),
        paddingHorizontal: n(12),
        paddingVertical: n(10),
    },
    dot: {
        width: n(7),
        height: n(7),
        borderRadius: n(4),
    },
});
