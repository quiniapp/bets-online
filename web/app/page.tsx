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
    <Box className="flex flex-col min-h-full overflow-x-hidden">
      <HeaderIndex />
      <FlexCol className="items-center w-full flex-1">
        <HeroBannerIndex />
        <ProvidersBar selected={selectedProvider} onSelect={setSelectedProvider} />
        <Flex className="p-4 border-t border-border justify-center w-full flex-1">
          <GamesList providerName={selectedProvider} />
        </Flex>
      </FlexCol>
      <Footer />
    </Box>
  );
}
