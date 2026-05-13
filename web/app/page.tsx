"use client"

import { useState } from "react";
import { Flex, FlexCol } from "@/components/flex";
import Box from "@/components/box";
import HeaderIndex from "@/components/header";
import HeroBannerIndex from "@/feature/hero";
import Footer from "@/components/footer";
import GamesList from "@/components/games";
import ProvidersBar from "@/components/providers-bar";
import CategoriesBar from "@/components/categories-bar";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";

export default function LandingPage() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  return (
    <Box className="flex flex-col min-h-full overflow-x-hidden">
      <HeaderIndex />
      <FlexCol className="items-center w-full flex-1">
        <HeroBannerIndex />
        <CategoriesBar selected={selectedCategory} onSelect={setSelectedCategory} />
        <ProvidersBar selected={selectedProvider} onSelect={setSelectedProvider} />
        <div className="w-full px-4 py-2">
          <Input
            placeholder="Buscar juegos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Flex className="p-4 border-t border-border justify-center w-full flex-1">
          <GamesList
            providerName={selectedProvider}
            gameType={selectedCategory === '__otros__' ? null : selectedCategory}
            excludeGameTypes={selectedCategory === '__otros__' ? 'videoSlots,LiveGames,Roulette' : null}
            search={debouncedSearch}
          />
        </Flex>
      </FlexCol>
      <Footer />
    </Box>
  );
}
