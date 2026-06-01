"use client"

import { useState, useEffect } from "react";
import { FlexCol } from "@/components/flex";
import Box from "@/components/box";
import HeaderIndex from "@/components/header";
import HeroBannerIndex from "@/feature/hero";
import Footer from "@/components/footer";
import GamesList from "@/components/games";
import FeaturedSection from "@/components/games/featured-section";
import CategorySection from "@/components/games/category-section";
import ProvidersBar from "@/components/providers-bar";
import CategoriesBar from "@/components/categories-bar";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { HomeBottomNav } from "@/components/home-bottom-nav";
import { useCasinoSettings } from "@/hooks/useCasinoSettings";
import { apiService } from "@/services/api.service";

export default function LandingPage() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const debouncedSearch = useDebounce(search, 350);
  const { lobbySlots, headerCategories } = useCasinoSettings();

  useEffect(() => {
    apiService.get<{ types: string[] }>('/games/types').then(res => {
      if (res.success && res.data) setAvailableTypes(res.data.types);
    });
  }, []);

  const hasFilter = selectedCategory !== null || selectedProvider !== null || debouncedSearch.trim().length > 0;

  const handleShowAll = (gameType: string) => {
    setSelectedCategory(gameType);
  };

  return (
    <Box className="flex flex-col min-h-full overflow-x-hidden pb-16 md:pb-0">
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

        {hasFilter ? (
          <div className="w-full px-4 py-2">
            <GamesList
              providerName={selectedProvider}
              gameType={selectedCategory === '__otros__' ? null : selectedCategory}
              excludeGameTypes={selectedCategory === '__otros__' ? 'videoSlots,LiveGames,Roulette' : null}
              search={debouncedSearch}
            />
          </div>
        ) : (
          <>
            <FeaturedSection onShowAll={() => setSelectedCategory(null)} />
            {lobbySlots.map(slot => (
              <CategorySection
                key={slot.id}
                title={slot.label}
                gameType={slot.kind === 'provider' ? null : (slot.categoryType ?? null)}
                providerName={slot.kind === 'category' ? null : (slot.providerName ?? null)}
                limit={8}
                onShowAll={handleShowAll}
              />
            ))}
          </>
        )}
      </FlexCol>
      <Footer />
      <HomeBottomNav
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        headerCategories={headerCategories}
        availableTypes={availableTypes}
      />
    </Box>
  );
}
