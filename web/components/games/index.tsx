"use client"

import { useGames } from "@/hooks/useGames"
import { Flex } from "../flex"
import GameCard from "./game-card"

const GamesList = () => {
    const { games, loading } = useGames(true)

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
                <GameCard key={game.id} game={game} />
            ))}
        </Flex>
    )
}
export default GamesList