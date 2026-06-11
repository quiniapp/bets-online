"use client"

import { useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useGames } from "@/hooks/useGames"
import ROUTER from "@/routes"
import GameCard from "./game-card"
import { Loader2, Gamepad2 } from "lucide-react"
import { SECTION_GRID as GRID } from "@/lib/two-row-grid"

interface GamesListProps {
    providerName?: string | null;
    gameType?: string | null;
    search?: string;
    excludeGameTypes?: string | null;
}

const GamesList = ({ providerName = null, gameType = null, search = '', excludeGameTypes = null }: GamesListProps) => {
    const { games, loading, loadingMore, loadMore } = useGames({ activeOnly: true, providerName, gameType, search, excludeGameTypes })
    const { user } = useAuth()
    const router = useRouter()
    const sentinelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) loadMore()
            },
            { threshold: 0.1 }
        )

        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [loadMore])

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
            <div className={`w-full ${GRID}`}>
                {[...Array(16)].map((_, i) => (
                    <div key={i} className="aspect-square bg-accent animate-pulse rounded-xl" />
                ))}
            </div>
        )
    }

    if (games.length === 0) {
        return (
            <div className="w-full flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <Gamepad2 className="h-12 w-12 opacity-40" />
                <p className="text-sm font-medium">No hay juegos disponibles</p>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className={GRID}>
                {games.map((game) => (
                    <GameCard key={game.id} game={game} onClick={() => handleGameClick(game.id)} />
                ))}
            </div>
            <div ref={sentinelRef} className="w-full flex justify-center py-4">
                {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
            </div>
        </div>
    )
}

export default GamesList
