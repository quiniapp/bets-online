"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useGames } from "@/hooks/useGames"
import GameCard from "./game-card"
import ROUTER from "@/routes"

const GRID = "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1.5 sm:gap-2"

interface CategorySectionProps {
  title: string
  emoji?: string
  gameType?: string | null
  providerName?: string | null
  limit?: number
  onShowAll?: (gameType: string) => void
}

const CategorySection = ({ title, emoji, gameType, providerName, limit = 8, onShowAll }: CategorySectionProps) => {
  const { games, loading } = useGames({ activeOnly: true, gameType: gameType ?? null, providerName: providerName ?? null })
  const { user } = useAuth()
  const router = useRouter()

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
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="aspect-square bg-accent animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (games.length === 0) return null

  return (
    <div className="w-full px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {emoji && <span className="text-xl">{emoji}</span>}
          <span className="font-bold text-lg">{title}</span>
        </div>
        {onShowAll && gameType && (
          <button
            onClick={() => onShowAll(gameType)}
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            Mostrar todo
            <span className="text-xs">›</span>
          </button>
        )}
      </div>
      <div className={GRID}>
        {games.slice(0, limit).map(game => (
          <GameCard key={game.id} game={game} onClick={() => handleGameClick(game.id)} />
        ))}
      </div>
    </div>
  )
}

export default CategorySection
