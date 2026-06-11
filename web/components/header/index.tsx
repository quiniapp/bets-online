"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOutIcon, UserIcon, Grid3x3, Gamepad2, Tv2, Flame, CircleDot, Trophy, Menu, LayoutDashboard, User, History, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import ROUTER from "@/routes";
import { Flex } from "../flex";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { apiService } from "@/services/api.service";
import type { Balance } from "helper";
import { formatChips } from "@/lib/utils";

const GAME_ITEMS = [
    { type: null,          label: "Lobby",         icon: Grid3x3   },
    { type: "videoSlots",  label: "Casino",        icon: Gamepad2  },
    { type: "LiveGames",   label: "Casino en Vivo",icon: Tv2       },
    { type: "CrashGame",   label: "Crash",         icon: Flame     },
    { type: "Roulette",    label: "Ruletas",       icon: CircleDot },
    { type: "Blackjack",   label: "Blackjack",     icon: Trophy    },
]

const HeaderIndex = () => {
    const router = useRouter()
    const { user, role, logout } = useAuth()
    const [logoutOpen, setLogoutOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [gamesOpen, setGamesOpen] = useState(true)
    const [balance, setBalance] = useState<Balance | null>(null)

    useEffect(() => {
        if (!user) return
        apiService.get<{ balance: Balance }>('/chips/my-balance').then(r => {
            if (r.success && r.data) setBalance(r.data.balance)
        }).catch(() => {})
    }, [user])

    const getDashboardRoute = () => {
        if (role === 'ADMIN' || role === 'OWNER') return ROUTER.ADMIN_DASHBOARD
        if (role === 'CASHIER') return ROUTER.CASHIER_DASHBOARD
        return ROUTER.USER_DASHBOARD
    }

    const playerMenuItems = [
        { label: "Dashboard", href: getDashboardRoute(), icon: LayoutDashboard },
        { label: "Mis Apuestas", href: ROUTER.USER_BETS, icon: History },
        { label: "Perfil", href: ROUTER.USER_PROFILE, icon: User },
        { label: "Configuración", href: ROUTER.USER_SETTINGS, icon: Settings },
    ]

    return (
        <>
        <header className="flex justify-between items-center px-3 py-2 border-b border-primary/20 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
            {/* Left: hamburger (mobile) + logo */}
            <Flex className="items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Abrir menú"
                >
                    <Menu className="h-5 w-5" />
                </Button>
                <button onClick={() => router.push('/')} className="flex items-center">
                    <img
                        src="/logo-small.png"
                        alt="Logo"
                        className="h-10 w-auto max-w-[160px]"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </button>
            </Flex>

            {/* Right: nav */}
            <nav className="flex items-center gap-2">
                {user ? (
                    <>
                        {balance !== null && (
                            <div className="hidden sm:flex items-center bg-muted rounded-full px-3 py-1 text-sm font-semibold">
                                ${formatChips(balance.chipBalance)}
                            </div>
                        )}
                        {balance !== null && (
                            <div className="sm:hidden flex items-center bg-muted rounded-full px-2.5 py-1 text-xs font-semibold">
                                ${formatChips(balance.chipBalance)}
                            </div>
                        )}
                        <Button
                            onClick={() => setLogoutOpen(true)}
                            size="sm"
                            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold h-8 px-3"
                        >
                            <LogOutIcon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline ml-1">Salir</span>
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={() => router.push(ROUTER.LOGIN)}
                        size="sm"
                        className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold h-8 px-3"
                    >
                        <UserIcon className="h-3.5 w-3.5" />
                        <span className="ml-1">Ingresar</span>
                    </Button>
                )}
            </nav>
        </header>

        {/* Mobile hamburger drawer */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                <div className="flex h-full flex-col">
                    <div className="flex h-14 items-center border-b px-5">
                        <button
                            onClick={() => { setMenuOpen(false); router.push('/') }}
                            aria-label="Ir al inicio"
                            className="flex items-center"
                        >
                            <img src="/logo-small.png" alt="Logo" className="h-10 w-auto max-w-[160px]" />
                        </button>
                    </div>

                    <ScrollArea className="flex-1 px-3 py-4">
                        <nav className="space-y-1">
                            {/* Juegos section (collapsible) */}
                            <Collapsible open={gamesOpen} onOpenChange={setGamesOpen}>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-between font-medium">
                                        <span className="flex items-center gap-2">
                                            <Gamepad2 className="h-4 w-4" />
                                            Juegos
                                        </span>
                                        {gamesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-0.5 mt-0.5">
                                    {GAME_ITEMS.map(item => {
                                        const Icon = item.icon
                                        return (
                                            <Button
                                                key={String(item.type)}
                                                variant="ghost"
                                                className="w-full justify-start pl-8 font-normal"
                                                onClick={() => {
                                                    setMenuOpen(false)
                                                    if (item.type === null) {
                                                        router.push('/')
                                                    } else {
                                                        router.push(`/?category=${item.type}`)
                                                    }
                                                }}
                                            >
                                                <Icon className="h-4 w-4 mr-2" />
                                                {item.label}
                                            </Button>
                                        )
                                    })}
                                </CollapsibleContent>
                            </Collapsible>

                            {/* Player links */}
                            {user && (
                                <>
                                    <div className="h-px bg-border my-2" />
                                    {playerMenuItems.map(item => (
                                        <Button
                                            key={item.href}
                                            variant="ghost"
                                            className="w-full justify-start font-normal"
                                            onClick={() => { setMenuOpen(false); router.push(item.href) }}
                                        >
                                            <item.icon className="h-4 w-4 mr-2" />
                                            {item.label}
                                        </Button>
                                    ))}
                                </>
                            )}
                        </nav>
                    </ScrollArea>

                    {user && (
                        <div className="border-t p-4 space-y-2">
                            {balance !== null && (
                                <div className="text-sm font-semibold text-center bg-muted rounded-full py-1.5">
                                    ${formatChips(balance.chipBalance)}
                                </div>
                            )}
                            <div className="text-xs text-muted-foreground text-center">{user.username}</div>
                            <Button
                                size="sm"
                                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
                                onClick={() => { setMenuOpen(false); setLogoutOpen(true) }}
                            >
                                <LogOutIcon className="h-4 w-4 mr-2" />
                                Salir
                            </Button>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>

        <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>¿Cerrar sesión?</DialogTitle>
                    <p className="text-sm text-muted-foreground">¿Seguro que querés cerrar la sesión?</p>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setLogoutOpen(false)}>Cancelar</Button>
                    <Button variant="destructive" onClick={() => { setLogoutOpen(false); logout() }}>Confirmar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}
export default HeaderIndex;
