import { Flex } from "../flex"
import GameCard from "./game-card"

const GamesList = () => {

    return (
        <Flex className="max-w-[1440px] w-full gap-4 h-full flex-wrap  ">
            {[...Array(20)].map((_, index) => (
                <GameCard key={index} />
            ))}
        </Flex>
    )
}
export default GamesList