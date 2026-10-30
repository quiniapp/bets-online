import { Play, Gamepad2, Heart } from "lucide-react"
import type { Game } from "helper"
import { UserRole } from "helper"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useFavorites } from "@/contexts/favorites-context"

interface GameCardProps {
  game: Game
  onClick?: () => void
}

const GameCard = ({ game, onClick }: GameCardProps) => {
  const { role } = useAuth()
  const { favoriteIds, toggleFavorite } = useFavorites()
  const isPlayer = role === UserRole.PLAYER
  const isFavorite = favoriteIds.has(game.id)

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFavorite(game.id)
  }

  return (
    <div onClick={onClick} className="cursor-pointer outline-none">
      <div
        className={cn(
          "group rounded-xl overflow-hidden transition-all duration-300 outline-none border",
          "hover:scale-105 hover:shadow-lg hover:shadow-primary/25 relative"
        )}
        style={{
          borderRadius: 'var(--game-card-radius, 0.75rem)',
          borderColor: 'var(--game-card-border, transparent)',
        }}
      >
        <div
          className="relative aspect-square bg-zinc-900 overflow-hidden"
          style={{ backgroundColor: 'var(--game-card-background, #18181b)' }}
        >
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
          <div
            className="absolute inset-x-0 bottom-0 h-12"
            style={{ backgroundImage: 'linear-gradient(to top, var(--game-card-overlay, rgba(0,0,0,0.8)), transparent)' }}
          />
          {isPlayer && (
            <button
              onClick={handleToggleFavorite}
              className="absolute top-2 right-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <Heart className={"h-4 w-4 transition-colors " + (isFavorite ? "fill-red-500 text-red-500" : "text-white")} />
            </button>
          )}
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
