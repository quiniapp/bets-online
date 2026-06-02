"use client"

import { Grid3x3, Gamepad2, Tv2, Flame, CircleDot, Trophy, Layers, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const typeConfig: Record<string, { label: string; icon: LucideIcon }> = {
  videoSlots:   { label: "Casino",        icon: Gamepad2  },
  LiveGames:    { label: "En Vivo",       icon: Tv2       },
  CrashGame:    { label: "Crash",         icon: Flame     },
  Roulette:     { label: "Ruletas",       icon: CircleDot },
  Blackjack:    { label: "Blackjack",     icon: Trophy    },
  Bingo:        { label: "Bingo",         icon: Grid3x3   },
  Baccarat:     { label: "Baccarat",      icon: CircleDot },
  ActionGames:  { label: "Acción",        icon: Layers    },
  InstantGames: { label: "Instantáneos",  icon: Layers    },
  Dice:         { label: "Dados",         icon: Layers    },
  Plinko:       { label: "Plinko",        icon: Layers    },
}

const MAX_CATEGORY_ITEMS = 5

interface HomeBottomNavProps {
  selected: string | null
  onSelect: (type: string | null) => void
  headerCategories?: string[]
  availableTypes?: string[]
}

export function HomeBottomNav({ selected, onSelect, headerCategories, availableTypes }: HomeBottomNavProps) {
  const orderedTypes = headerCategories
    ? headerCategories
        .filter(t => !availableTypes?.length || availableTypes.includes(t))
        .slice(0, MAX_CATEGORY_ITEMS)
    : []

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16 w-full">
        {/* Lobby */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors select-none min-w-0",
            selected === null ? "text-primary" : "text-muted-foreground"
          )}
        >
          {selected === null && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
          )}
          <Grid3x3 className={cn("h-5 w-5 shrink-0 transition-all", selected === null ? "stroke-[2.5]" : "stroke-[1.5]")} />
          <span className={cn("text-[9px] leading-none w-full text-center truncate px-0.5", selected === null ? "font-semibold" : "font-medium")}>
            Lobby
          </span>
        </button>

        {orderedTypes.map(type => {
          const config = typeConfig[type]
          const Icon = config?.icon ?? Gamepad2
          const label = config?.label ?? type
          const isActive = selected === type

          return (
            <button
              key={type}
              onClick={() => onSelect(isActive ? null : type)}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors select-none min-w-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
              )}
              <Icon className={cn("h-5 w-5 shrink-0 transition-all", isActive ? "stroke-[2.5]" : "stroke-[1.5]")} />
              <span className={cn("text-[9px] leading-none w-full text-center truncate px-0.5", isActive ? "font-semibold" : "font-medium")}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
