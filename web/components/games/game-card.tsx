import { Play, Gamepad2 } from "lucide-react"
import type { Game } from "helper"
import { cn } from "@/lib/utils"

interface GameCardProps {
  game: Game
  onClick?: () => void
}

const GameCard = ({ game, onClick }: GameCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group rounded-lg border border-border overflow-hidden cursor-pointer transition-all",
        "hover:border-primary/40 bg-card"
      )}
    >
      <div className="relative aspect-[3/4] bg-black overflow-hidden">
        {game.defaultLogo ? (
          <img
            src={game.defaultLogo}
            alt={game.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Gamepad2 className="h-6 w-6 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-lg pointer-events-none">
            <Play className="h-2.5 w-2.5 fill-current" />
            Jugar
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameCard
