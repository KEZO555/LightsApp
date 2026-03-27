import React, { memo, useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

export const TypingIndicator = memo(function TypingIndicator() {
    const { invertColors } = useInvertColors();
    const dotColor = invertColors ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)";
    const bgColor = invertColors ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";

    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = (dot: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                ])
            );

        const a1 = animate(dot1, 0);
        const a2 = animate(dot2, 200);
        const a3 = animate(dot3, 400);
        a1.start();
        a2.start();
        a3.start();

        return () => { a1.stop(); a2.stop(); a3.stop(); };
    }, [dot1, dot2, dot3]);

    const renderDot = (anim: Animated.Value) => (
        <Animated.View
            style={[
                styles.dot,
                { backgroundColor: dotColor },
                { transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
                { opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
            ]}
        />
    );

    return (
        <View style={styles.wrapper}>
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                {renderDot(dot1)}
                {renderDot(dot2)}
                {renderDot(dot3)}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: n(12),
        paddingVertical: n(2),
        alignItems: "flex-start",
    },
    container: {
        flexDirection: "row",
        gap: n(4),
        borderRadius: n(12),
        paddingHorizontal: n(14),
        paddingVertical: n(10),
    },
    dot: {
        width: n(7),
        height: n(7),
        borderRadius: n(4),
    },
});
