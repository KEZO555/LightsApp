import React from "react";
import { View, StyleSheet } from "react-native";
import { StyledText } from "@/components/StyledText";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

interface ReadingProgressProps {
	percentage: number;
	timeRemaining: string;
}

export function ReadingProgress({ percentage, timeRemaining }: ReadingProgressProps) {
	const { invertColors } = useInvertColors();

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: invertColors ? "white" : "black" },
			]}
		>
			<StyledText style={styles.text}>{percentage}%</StyledText>
			<StyledText style={styles.text}>{timeRemaining}</StyledText>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: n(24),
		paddingVertical: n(10),
	},
	text: {
		fontSize: n(14),
		opacity: 0.5,
	},
});
