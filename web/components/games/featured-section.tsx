"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useLobby } from "@/contexts/lobby-context"
import { apiService } from "@/services/api.service"
import type { FeaturedGameWithGame } from "helper"
import GameCard from "./game-card"
import ROUTER from "@/routes"
import { SECTION_GRID as GRID, TWO_ROW_MAX_ITEMS, featuredItemClass } from "@/lib/two-row-grid"

interface FeaturedSectionProps {
  onShowAll?: () => void
}

const FeaturedSection = ({ onShowAll }: FeaturedSectionProps) => {
  // Under LobbyProvider the featured list comes with the aggregated /lobby
  // payload — no own request unless the lobby fetch failed.
  const lobby = useLobby()
  const lobbyActive = !!lobby && (lobby.loading || lobby.data !== null)

  const [ownItems, setOwnItems] = useState<FeaturedGameWithGame[]>([])
  const [ownLoading, setOwnLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  const fetchFeatured = useCallback(async () => {
    setOwnLoading(true)
    const res = await apiService.get<FeaturedGameWithGame[]>('/featured-games')
    if (res.success && res.data) {
      setOwnItems(res.data.filter(f => f.isActive && f.game))
    }
    setOwnLoading(false)
  }, [])

  useEffect(() => {
    if (lobbyActive) return
    fetchFeatured()
  }, [fetchFeatured, lobbyActive])

  const items = lobbyActive
    ? (lobby!.data?.featured ?? []).filter(f => f.isActive && f.game)
    : ownItems
  const loading = lobbyActive ? lobby!.loading : ownLoading

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
        {items.slice(0, TWO_ROW_MAX_ITEMS).map((item, idx) => (
          <div key={item.id} className={featuredItemClass(idx)}>
            <GameCard
              game={item.game!}
              onClick={() => handleGameClick(item.game!.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default FeaturedSection
