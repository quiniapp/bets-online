"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Flame, Play } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { apiService } from "@/services/api.service"
import ROUTER from "@/routes"
import type { GameBanner } from "helper"

/**
 * Small promo banners (one per game) shown in a row. Managed from the admin
 * "Banners" page with placement = "promo" and a linked game.
 */
export function PromoSection() {
  const [items, setItems] = useState<GameBanner[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiService.get<GameBanner[]>("/banners?placement=promo")
      if (res.success && res.data) {
        setItems(res.data.filter(b => b.isActive && b.imageUrl && b.gameId))
      }
    } catch {
      // non-critical section
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleClick = (gameId: string) => {
    const playUrl = `${ROUTER.USER_GAME_PLAY}/${gameId}/play`
    if (user) router.push(playUrl)
    else router.push(`${ROUTER.LOGIN}?redirect=${encodeURIComponent(playUrl)}`)
  }

  if (loading) {
    return (
      <div className="w-full px-4 py-2">
        <div className="mx-auto max-w-7xl">
          <div className="h-5 w-40 bg-accent animate-pulse rounded mb-3" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[2.4/1] bg-accent animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className="w-full px-4 py-2">
      <div className="mx-auto max-w-7xl">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-5 w-5 text-primary" />
        <span className="font-bold text-lg uppercase">Promociones</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {items.slice(0, 8).map(banner => (
          <button
            key={banner.id}
            onClick={() => banner.gameId && handleClick(banner.gameId)}
            className="group relative aspect-[2.4/1] w-full overflow-hidden rounded-xl ring-1 ring-primary/20"
          >
            <img
              src={banner.imageUrl ?? undefined}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-2 flex justify-center">
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-lg shadow-primary/40">
                <Play className="h-2.5 w-2.5 fill-current" />
                Jugar
              </span>
            </div>
          </button>
        ))}
      </div>
      </div>
    </div>
  )
}
