import { Play, Gamepad2 } from "lucide-react"
import type { Game } from "helper"
import { cn } from "@/lib/utils"

interface GameCardProps {
  game: Game
  onClick?: () => void
}

const GameCard = ({ game, onClick }: GameCardProps) => {
  return (
    <div onClick={onClick} className="cursor-pointer outline-none">
      <div
        className={cn(
          "group rounded-xl overflow-hidden transition-all duration-300 outline-none",
          "hover:scale-105 hover:shadow-lg hover:shadow-primary/25 relative"
        )}
      >
        <div className="relative aspect-square bg-zinc-900 overflow-hidden">
          {(game.customLogo ?? game.defaultLogo) ? (
            <img
              src={game.customLogo ?? game.defaultLogo!}
              alt={game.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Gamepad2 className="h-6 w-6 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-lg shadow-primary/40">
              <Play className="h-2.5 w-2.5 fill-current" />
              Jugar
            </div>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-center text-muted-foreground mt-1 truncate px-0.5 leading-tight">
        {game.name}
      </p>
    </div>
  )
}

export default GameCard
