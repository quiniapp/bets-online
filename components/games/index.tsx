import { Flex } from "../flex"
import GameCard from "./game-card"

const GamesList = () => {

    return (
        <Flex className="max-w-[1440px] w-full gap-4 h-[100px] flex-wrap">
            {[...Array(20)].map(() => (
                <GameCard />
            ))}
        </Flex>
    )
}
export default GamesList