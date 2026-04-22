"use client"

import { useState } from "react";
import { Flex, FlexCol } from "@/components/flex";
import Box from "@/components/box";
import HeaderIndex from "@/components/header";
import HeroBannerIndex from "@/feature/hero";
import Footer from "@/components/footer";
import GamesList from "@/components/games";
import ProvidersBar from "@/components/providers-bar";

export default function LandingPage() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  return (
    <Box className="grid grid-rows-[auto_1fr_auto] h-full">
      <HeaderIndex />
      <FlexCol className="items-center">
        <HeroBannerIndex />
        <ProvidersBar selected={selectedProvider} onSelect={setSelectedProvider} />
        <Flex className="p-4 border-t-1 justify-center h-full">
          <GamesList providerName={selectedProvider} />
        </Flex>
      </FlexCol>
      <Footer />
    </Box>
  );
}
