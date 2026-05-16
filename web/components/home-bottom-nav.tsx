"use client"

import { Grid3x3, Gamepad2, Tv2, Flame, CircleDot, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { type: null,          label: "Lobby",   icon: Grid3x3  },
  { type: "videoSlots",  label: "Slots",   icon: Gamepad2 },
  { type: "LiveGames",   label: "En Vivo", icon: Tv2      },
  { type: "CrashGame",   label: "Crash",   icon: Flame    },
  { type: "Roulette",    label: "Ruletas", icon: CircleDot },
  { type: "Blackjack",   label: "Blackjack", icon: Trophy },
] as const

interface HomeBottomNavProps {
  selected: string | null
  onSelect: (type: string | null) => void
}

export function HomeBottomNav({ selected, onSelect }: HomeBottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border overflow-x-auto scrollbar-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16 min-w-max px-1">
        {NAV_ITEMS.map(item => {
          const isActive = selected === item.type
          const Icon = item.icon
          return (
            <button
              key={String(item.type)}
              onClick={() => onSelect(isActive ? null : item.type)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-4 transition-colors select-none",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-b-full" />
              )}
              <Icon className={cn("h-5 w-5 transition-all", isActive ? "stroke-[2.5]" : "stroke-[1.5]")} />
              <span className={cn("text-[10px] leading-none whitespace-nowrap", isActive ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
