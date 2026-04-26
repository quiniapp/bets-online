"use client"

import { useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useGames } from "@/hooks/useGames"
import ROUTER from "@/routes"
import GameCard from "./game-card"
import { Loader2, Gamepad2 } from "lucide-react"

interface GamesListProps {
    providerName?: string | null;
}

const GRID = "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1.5 sm:gap-2"

const GamesList = ({ providerName = null }: GamesListProps) => {
    const { games, loading, loadingMore, loadMore } = useGames(true, providerName)
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
            <div className={`max-w-[1440px] w-full ${GRID}`}>
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="aspect-[3/4] bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 animate-pulse rounded-md" />
                ))}
            </div>
        )
    }

    if (games.length === 0) {
        return (
            <div className="max-w-[1440px] w-full flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <Gamepad2 className="h-12 w-12 opacity-40" />
                <p className="text-sm font-medium">No hay juegos disponibles</p>
            </div>
        )
    }

    return (
        <div className="max-w-[1440px] w-full">
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
