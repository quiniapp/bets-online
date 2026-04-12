import type { Game } from "helper"
import { Flex, FlexCol } from "../flex"

interface GameCardProps {
  game: Game
}

const GameCard = ({ game }: GameCardProps) => {
  return (
    <Flex className="flex-1 min-w-[300px] h-[100px] bg-accent rounded-md overflow-hidden">
      {game.defaultLogo ? (
        <img
          src={game.defaultLogo}
          alt={game.name}
          className="h-full w-[100px] object-cover flex-shrink-0"
        />
      ) : (
        <Flex className="h-full w-[100px] bg-muted flex-shrink-0 items-center justify-center text-muted-foreground text-xs">
          Sin imagen
        </Flex>
      )}
      <FlexCol className="p-3 gap-1 justify-center">
        <span className="font-semibold text-sm leading-tight">{game.name}</span>
        {game.gameType && (
          <span className="text-xs text-muted-foreground capitalize">{game.gameType}</span>
        )}
      </FlexCol>
    </Flex>
  )
}
export default GameCard