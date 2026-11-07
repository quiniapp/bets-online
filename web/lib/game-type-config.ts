import {
    Gamepad2,
    CircleDot,
    Tv2,
    Flame,
    Grid3x3,
    Trophy,
    Layers,
    type LucideIcon,
} from 'lucide-react';

export interface GameTypeConfig {
    label: string;
    icon: LucideIcon;
}

/** Shared label/icon mapping for the header category pills. */
export const gameTypeConfig: Record<string, GameTypeConfig> = {
    videoSlots:   { label: 'Casino',            icon: Gamepad2  },
    Roulette:     { label: 'Ruletas',            icon: CircleDot },
    LiveGames:    { label: 'Casino en Vivo',     icon: Tv2       },
    CrashGame:    { label: 'Crash',              icon: Flame     },
    Bingo:        { label: 'Bingo',              icon: Grid3x3   },
    Blackjack:    { label: 'Blackjack',          icon: Trophy    },
    ActionGames:  { label: 'Acción',             icon: Layers    },
    InstantGames: { label: 'Instantáneos',       icon: Layers    },
    Dice:         { label: 'Dados',              icon: Layers    },
    Scratch:      { label: 'Scratch',            icon: Grid3x3   },
    Lottery:      { label: 'Lotería',            icon: Trophy    },
    Plinko:       { label: 'Plinko',             icon: Layers    },
    Baccarat:     { label: 'Baccarat',           icon: CircleDot },
} as const;
