"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { apiService } from "@/services/api.service"
import type { FeaturedGameWithGame } from "helper"
import GameCard from "./game-card"
import ROUTER from "@/routes"

const GRID = "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1.5 sm:gap-2"

interface FeaturedSectionProps {
  onShowAll?: () => void
}

const FeaturedSection = ({ onShowAll }: FeaturedSectionProps) => {
  const [items, setItems] = useState<FeaturedGameWithGame[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  const fetchFeatured = useCallback(async () => {
    setLoading(true)
    const res = await apiService.get<FeaturedGameWithGame[]>('/featured-games')
    if (res.success && res.data) {
      setItems(res.data.filter(f => f.isActive && f.game))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchFeatured() }, [fetchFeatured])

  const handleGameClick = (gameId: string) => {
    const playUrl = `${ROUTER.USER_GAME_PLAY}/${gameId}/play`
    if (user) {
      router.push(playUrl)
    } else {
      router.push(`${ROUTER.LOGIN}?redirect=${encodeURIComponent(playUrl)}`)
    }
  }

  if (loading) {
    return (
      <div className="w-full px-4 py-2">
        <div className="h-5 w-40 bg-accent animate-pulse rounded mb-3" />
        <div className={GRID}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-accent animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className="w-full px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⭐</span>
          <span className="font-bold text-lg">Juegos Destacados</span>
        </div>
        {onShowAll && (
          <button
            onClick={onShowAll}
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            Mostrar todo
            <span className="text-xs">›</span>
          </button>
        )}
      </div>
      <div className={GRID}>
        {items.slice(0, 16).map(item => (
          <GameCard
            key={item.id}
            game={item.game!}
            onClick={() => handleGameClick(item.game!.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default FeaturedSection
