"use client"

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import type { LobbySlot } from "helper";

interface FilterUpdates {
  provider?: string | null;
  category?: string | null;
}

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters live in the URL so they survive reloads, are shareable and
  // "Ver más" / header links can deep-link into a filtered lobby.
  const selectedProvider = searchParams.get("provider");
  const selectedCategory = searchParams.get("category") ?? searchParams.get("type");

  const [search, setSearch] = useState("");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const debouncedSearch = useDebounce(search, 350);
  const { lobbySlots, headerCategories, bottomNavItems } = useCasinoSettings();

  useEffect(() => {
    apiService.get<{ types: string[] }>('/games/types').then(res => {
      if (res.success && res.data) setAvailableTypes(res.data.types);
    });
  }, []);

  const applyFilters = useCallback((updates: FilterUpdates) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("type"); // legacy param, replaced by "category"
    if (updates.provider !== undefined) {
      if (updates.provider) params.set("provider", updates.provider);
      else params.delete("provider");
    }
    if (updates.category !== undefined) {
      if (updates.category) params.set("category", updates.category);
      else params.delete("category");
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
  }, [router, searchParams]);

  const hasFilter = selectedCategory !== null || selectedProvider !== null || debouncedSearch.trim().length > 0;

  const handleSlotShowAll = (slot: LobbySlot) => {
    applyFilters({
      category: slot.kind === 'provider' ? null : (slot.categoryType ?? null),
      provider: slot.kind === 'category' ? null : (slot.providerName ?? null),
    });
  };

  return (
    <Box className="flex flex-col min-h-full overflow-x-hidden pb-16 md:pb-0">
      <HeaderIndex />
      <FlexCol className="items-center w-full flex-1">
        <HeroBannerIndex />
        <CategoriesBar selected={selectedCategory} onSelect={v => applyFilters({ category: v })} />
        <ProvidersBar selected={selectedProvider} onSelect={v => applyFilters({ provider: v })} />

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
            <FeaturedSection onShowAll={() => applyFilters({ category: null })} />
            {lobbySlots.map(slot => (
              <CategorySection
                key={slot.id}
                title={slot.label}
                gameType={slot.kind === 'provider' ? null : (slot.categoryType ?? null)}
                providerName={slot.kind === 'category' ? null : (slot.providerName ?? null)}
                onShowAll={() => handleSlotShowAll(slot)}
              />
            ))}
          </>
        )}
      </FlexCol>
      <Footer />
      <HomeBottomNav
        selected={selectedCategory}
        onSelect={v => applyFilters({ category: v, ...(v === null ? { provider: null } : {}) })}
        headerCategories={headerCategories}
        availableTypes={availableTypes}
        bottomNavItems={bottomNavItems}
      />
    </Box>
  );
}

// useSearchParams requires a Suspense boundary in the App Router.
export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingContent />
    </Suspense>
  );
}
