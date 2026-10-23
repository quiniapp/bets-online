"use client"
import * as React from "react"
import { apiService } from "@/services/api.service"
import type { GameBanner } from "helper"
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"

function usePublicBanners() {
  const [banners, setBanners] = React.useState<GameBanner[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true
    ;(async () => {
      const response = await apiService.get<GameBanner[]>("/banners")
      if (active && response.success && response.data) {
        setBanners(
          response.data
            .filter(b => b.isActive && b.imageUrl)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        )
      }
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  return { banners, loading }
}

const HeroBannerIndex = () => {
  const { banners, loading } = usePublicBanners()
  const autoplay = React.useRef(Autoplay({ delay: 5000, stopOnInteraction: false }))

  if (loading) {
    return (
      <div className="w-full px-4 py-2">
        <div className="mx-auto h-40 max-w-7xl sm:h-56 md:h-72 lg:h-80 xl:h-96 w-full rounded-xl bg-accent animate-pulse" />
      </div>
    )
  }

  if (banners.length === 0) return null

  return (
    <div className="w-full px-4 py-2">
      <Carousel
        opts={{ loop: banners.length > 1 }}
        plugins={banners.length > 1 ? [autoplay.current] : []}
        className="mx-auto w-full max-w-7xl"
      >
        <CarouselContent>
          {banners.map((banner, index) => (
            <CarouselItem key={banner.id}>
              <div className="relative h-40 sm:h-56 md:h-72 lg:h-80 xl:h-96 w-full rounded-xl overflow-hidden bg-zinc-900 ring-1 ring-primary/20">
                {/* First banner is the LCP — fetch it ASAP; the rest can wait */}
                <img
                  src={banner.imageUrl ?? undefined}
                  alt="Banner"
                  className="w-full h-full object-cover object-center"
                  decoding="async"
                  fetchPriority={index === 0 ? "high" : "auto"}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  )
}

export default HeroBannerIndex
