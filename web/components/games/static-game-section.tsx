"use client"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import GameCard from "./game-card"
import ROUTER from "@/routes"
import { SECTION_GRID as GRID } from "@/lib/two-row-grid"
import type { Game } from "helper"

interface StaticGameSectionProps {
  title: string
  emoji?: string
  games: Game[]
  loading?: boolean
  maxItems?: number
}

/**
 * A lobby section backed by an already-loaded list of games (no own fetch),
 * used for "recently played" and "favorites". Hides itself when empty.
 */
export function StaticGameSection({ title, emoji, games, loading, maxItems = 8 }: StaticGameSectionProps) {
  const { user } = useAuth()
  const router = useRouter()

  const handleGameClick = (gameId: string) => {
    const playUrl = `${ROUTER.USER_GAME_PLAY}/${gameId}/play`
    if (user) router.push(playUrl)
    else router.push(`${ROUTER.LOGIN}?redirect=${encodeURIComponent(playUrl)}`)
  }

  if (loading) {
    return (
      <div className="w-full px-4 py-2">
        <div className="h-5 w-40 bg-accent animate-pulse rounded mb-3" />
        <div className={GRID}>
          {[...Array(maxItems)].map((_, i) => (
            <div key={i} className="aspect-square bg-accent animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (games.length === 0) return null

  return (
    <div className="w-full px-4 py-2">
      <div className="flex items-center gap-2 mb-3">
        {emoji && <span className="text-xl">{emoji}</span>}
        <span className="font-bold text-lg uppercase">{title}</span>
      </div>
      <div className={GRID}>
        {games.slice(0, maxItems).map(game => (
          <div key={game.id}>
            <GameCard game={game} onClick={() => handleGameClick(game.id)} />
          </div>
        ))}
      </div>
    </div>
  )
}
