"use client"

import { useState } from "react";
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

const CATEGORY_SECTIONS = [
  { gameType: "videoSlots",   title: "Slots",            emoji: "🎰" },
  { gameType: "LiveGames",    title: "Casino en Vivo",   emoji: "📺" },
  { gameType: "CrashGame",   title: "Crash",            emoji: "🔥" },
  { gameType: "Roulette",    title: "Ruletas",           emoji: "🎡" },
  { gameType: "Blackjack",   title: "Blackjack",         emoji: "🃏" },
  { gameType: "Baccarat",    title: "Baccarat",          emoji: "♠️" },
  { gameType: "Bingo",       title: "Bingo",             emoji: "🎱" },
  { gameType: "Plinko",      title: "Plinko",            emoji: "🪂" },
];

export default function LandingPage() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const hasFilter = selectedCategory !== null || selectedProvider !== null || debouncedSearch.trim().length > 0;

  const handleShowAll = (gameType: string) => {
    setSelectedCategory(gameType);
  };

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
            {CATEGORY_SECTIONS.map(({ gameType, title, emoji }) => (
              <CategorySection
                key={gameType}
                gameType={gameType}
                title={title}
                emoji={emoji}
                limit={8}
                onShowAll={handleShowAll}
              />
            ))}
          </>
        )}
      </FlexCol>
      <Footer />
    </Box>
  );
}
