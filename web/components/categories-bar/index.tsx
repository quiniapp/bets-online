"use client"

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.service';
import { Flex } from '../flex';
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

interface TypeConfig {
    label: string;
    icon: LucideIcon;
}

const typeConfig: Record<string, TypeConfig> = {
    videoSlots:   { label: 'Slots',             icon: Gamepad2  },
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
};

interface CategoriesBarProps {
    selected: string | null;
    onSelect: (type: string | null) => void;
}

const CategoriesBar = ({ selected, onSelect }: CategoriesBarProps) => {
    const [types, setTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTypes = async () => {
            setLoading(true);
            const response = await apiService.get<{ types: string[] }>('/games/types');
            if (response.success && response.data) {
                setTypes(response.data.types);
            }
            setLoading(false);
        };
        fetchTypes();
    }, []);

    const pillClass = (active: boolean) =>
        `shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
            active
                ? 'bg-primary text-primary-foreground scale-105 shadow-sm shadow-primary/40'
                : 'bg-accent text-accent-foreground hover:bg-primary/80 hover:text-primary-foreground hover:scale-105'
        }`;

    if (loading) {
        return (
            <Flex className="w-full max-w-[95vw] gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-8 w-24 shrink-0 bg-accent animate-pulse rounded-full" />
                ))}
            </Flex>
        );
    }

    if (types.length === 0) return null;

    const knownTypes = types.filter(t => t in typeConfig);
    const otherTypes = types.filter(t => !(t in typeConfig));

    const allPills = (
        <>
            <button onClick={() => onSelect(null)} className={pillClass(selected === null)}>
                <Grid3x3 className="h-3.5 w-3.5" />
                Lobby
            </button>
            {knownTypes.map(type => {
                const config = typeConfig[type];
                const Icon = config.icon;
                return (
                    <button
                        key={type}
                        onClick={() => onSelect(selected === type ? null : type)}
                        className={pillClass(selected === type)}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {config.label}
                    </button>
                );
            })}
            {otherTypes.length > 0 && (
                <button
                    onClick={() => onSelect(selected === '__otros__' ? null : '__otros__')}
                    className={pillClass(selected === '__otros__')}
                >
                    <Gamepad2 className="h-3.5 w-3.5" />
                    Otros
                </button>
            )}
        </>
    );

    return (
        <>
            {/* Mobile: horizontal scroll */}
            <div className="sm:hidden w-full min-w-0 overflow-x-auto scrollbar-none">
                <Flex className="gap-2 px-4 py-3 w-max">
                    {allPills}
                </Flex>
            </div>

            {/* Desktop: wrap */}
            <div className="hidden sm:block w-full max-w-[95vw]">
                <Flex className="gap-2 px-4 py-3 flex-wrap">
                    {allPills}
                </Flex>
            </div>
        </>
    );
};

export default CategoriesBar;
