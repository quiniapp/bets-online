"use client"

import { useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useGames } from "@/hooks/useGames"
import ROUTER from "@/routes"
import { Flex } from "../flex"
import GameCard from "./game-card"
import { Loader2 } from "lucide-react"

interface GamesListProps {
    providerName?: string | null;
}

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
            <Flex className="max-w-[1440px] w-full gap-4 h-full flex-wrap">
                {[...Array(8)].map((_, i) => (
                    <Flex key={i} className="flex-1 min-w-[300px] h-[100px] bg-accent animate-pulse rounded-md" />
                ))}
            </Flex>
        )
    }

    if (games.length === 0) {
        return (
            <Flex className="max-w-[1440px] w-full items-center justify-center py-12 text-muted-foreground">
                No hay juegos disponibles
            </Flex>
        )
    }

    return (
        <Flex className="max-w-[1440px] w-full gap-4 h-full flex-wrap">
            {games.map((game) => (
                <GameCard key={game.id} game={game} onClick={() => handleGameClick(game.id)} />
            ))}
            <div ref={sentinelRef} className="w-full flex justify-center py-4">
                {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
            </div>
        </Flex>
    )
}

export default GamesList
