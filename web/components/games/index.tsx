"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useGames } from "@/hooks/useGames"
import ROUTER from "@/routes"
import { Flex } from "../flex"
import GameCard from "./game-card"

const GamesList = () => {
    const { games, loading } = useGames(true)
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
        </Flex>
    )
}
export default GamesList