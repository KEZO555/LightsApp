import React from "react";
import { StyledButton } from "@/components/StyledButton";
import { router } from "expo-router";
import ContentContainer from "@/components/ContentContainer";

export default function CustomiseScreen() {
    return (
        <ContentContainer headerTitle="Customise">
            <StyledButton
                text="Interface"
                onPress={() => router.push("/settings/customise-interface" as any)}
            />
        </ContentContainer>
    );
}
