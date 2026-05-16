"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { apiService } from "@/services/api.service"
import type { GameBannerWithGame } from "helper"
import ROUTER from "@/routes"

function usePublicBanners() {
    const [banners, setBanners] = useState<GameBannerWithGame[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBanners = useCallback(async () => {
        setLoading(true);
        const response = await apiService.get<GameBannerWithGame[]>('/banners');
        if (response.success && response.data) {
            setBanners(response.data.filter(b => b.isActive));
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchBanners(); }, [fetchBanners]);

    return { banners, loading };
}

const HeroBannerIndex = () => {
    const router = useRouter();
    const { banners, loading } = usePublicBanners();

    const getBannerImage = (banner: GameBannerWithGame): string | null => {
        return banner.imageUrl ?? banner.game?.customLogo ?? banner.game?.defaultLogo ?? null;
    };

    const handleBannerClick = (banner: GameBannerWithGame) => {
        router.push(`${ROUTER.USER_GAME_PLAY}/${banner.gameId}/play`);
    };

    if (loading) {
        return (
            <div className="w-full px-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                    <div className="h-32 xs:h-40 sm:h-52 md:h-64 w-full rounded-xl bg-accent animate-pulse" />
                    <div className="h-32 xs:h-40 sm:h-52 md:h-64 w-full rounded-xl bg-accent animate-pulse" />
                </div>
            </div>
        );
    }

    if (banners.length === 0) return null;

    const visible = banners.slice(0, 2);

    return (
        <div className="w-full px-4 py-2">
            <div className={visible.length === 1 ? "flex justify-center" : "grid grid-cols-2 gap-3"}>
                {visible.map((banner) => {
                    const imgSrc = getBannerImage(banner);
                    return (
                        <div
                            key={banner.id}
                            onClick={() => handleBannerClick(banner)}
                            className="relative h-32 xs:h-40 sm:h-52 md:h-64 w-full rounded-xl overflow-hidden cursor-pointer bg-zinc-900 ring-1 ring-primary/20 hover:ring-primary/50 transition-all duration-300"
                        >
                            {imgSrc ? (
                                <img
                                    src={imgSrc}
                                    alt={banner.game?.name ?? 'Banner'}
                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent flex items-center justify-center">
                                    <span className="text-foreground font-semibold text-lg">
                                        {banner.game?.name ?? 'Casino'}
                                    </span>
                                </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default HeroBannerIndex
