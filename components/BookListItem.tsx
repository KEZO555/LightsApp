import React, { memo } from "react";
import { View, StyleSheet, Image } from "react-native";
import { StyledText } from "@/components/StyledText";
import { HapticPressable } from "@/components/HapticPressable";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

interface BookListItemProps {
	title: string;
	author: string;
	coverUri: string | null;
	progress: number;
	onPress: () => void;
}

export const BookListItem = memo(function BookListItem({
	title,
	author,
	coverUri,
	progress,
	onPress,
}: BookListItemProps) {
	const { invertColors } = useInvertColors();
	const barBg = invertColors ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)";
	const barFill = invertColors ? "black" : "white";

	return (
		<HapticPressable onPress={onPress} style={styles.container}>
			<View
				style={[
					styles.cover,
					{ backgroundColor: invertColors ? "#E0E0E0" : "#333" },
				]}
			>
				{coverUri ? (
					<Image source={{ uri: coverUri }} style={styles.coverImage} />
				) : (
					<StyledText style={styles.coverPlaceholder} numberOfLines={2}>
						{title}
					</StyledText>
				)}
			</View>
			<View style={styles.info}>
				<StyledText style={styles.title} numberOfLines={2}>
					{title}
				</StyledText>
				<StyledText style={styles.author} numberOfLines={1}>
					{author}
				</StyledText>
				<View style={styles.progressContainer}>
					<View style={[styles.progressBar, { backgroundColor: barBg }]}>
						<View
							style={[
								styles.progressFill,
								{
									backgroundColor: barFill,
									width: `${progress}%`,
								},
							]}
						/>
					</View>
					<StyledText style={styles.progressText}>
						{progress > 0 ? `${progress}%` : "New"}
					</StyledText>
				</View>
			</View>
		</HapticPressable>
	);
});

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: n(12),
		gap: n(16),
	},
	cover: {
		width: n(60),
		height: n(85),
		borderRadius: n(4),
		overflow: "hidden",
		justifyContent: "center",
		alignItems: "center",
	},
	coverImage: {
		width: "100%",
		height: "100%",
		resizeMode: "cover",
	},
	coverPlaceholder: {
		fontSize: n(10),
		textAlign: "center",
		paddingHorizontal: n(4),
	},
	info: {
		flex: 1,
		gap: n(4),
	},
	title: {
		fontSize: n(24),
		lineHeight: n(28),
	},
	author: {
		fontSize: n(16),
		opacity: 0.6,
	},
	progressContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: n(8),
		marginTop: n(4),
	},
	progressBar: {
		flex: 1,
		height: n(3),
		borderRadius: n(2),
	},
	progressFill: {
		height: "100%",
		borderRadius: n(2),
	},
	progressText: {
		fontSize: n(13),
		opacity: 0.5,
	},
});
