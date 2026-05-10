"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import Autoplay from "embla-carousel-autoplay"
import { useState, useEffect, useCallback } from "react"
import { apiService } from "@/services/api.service"
import type { GameBannerWithGame } from "helper"

import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
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
    const plugin = React.useRef(
        Autoplay({ delay: 3000, stopOnInteraction: true })
    )
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
            <div className="w-full px-2 sm:px-4 py-2 sm:py-4">
                <div className="h-[120px] xs:h-[160px] sm:h-[280px] md:h-[400px] lg:h-[520px] w-full rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            </div>
        );
    }

    if (banners.length === 0) {
        return (
            <div className="w-full px-2 sm:px-4 py-2 sm:py-4">
                <div className="h-[120px] xs:h-[160px] sm:h-[280px] md:h-[400px] lg:h-[520px] w-full rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-border">
                    <div className="text-center px-4">
                        <p className="text-2xl font-bold text-foreground">Bienvenido</p>
                        <p className="text-muted-foreground mt-1">Los mejores juegos de casino</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full px-2 sm:px-4 py-2 sm:py-4">
            <Carousel plugins={[plugin.current]} className="w-full">
                <CarouselContent className="-ml-1">
                    {banners.map((banner) => {
                        const imgSrc = getBannerImage(banner);
                        return (
                            <CarouselItem key={banner.id} className="pl-1">
                                <div
                                    onClick={() => handleBannerClick(banner)}
                                    className="relative h-[120px] xs:h-[160px] sm:h-[280px] md:h-[400px] lg:h-[520px] w-full rounded-xl overflow-hidden cursor-pointer bg-zinc-900"
                                >
                                    {imgSrc ? (
                                        <img
                                            src={imgSrc}
                                            alt={banner.game?.name ?? 'Banner'}
                                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent flex items-center justify-center">
                                            <span className="text-foreground font-semibold text-lg">
                                                {banner.game?.name ?? 'Casino'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
            </Carousel>
        </div>
    )
}

export default HeroBannerIndex
