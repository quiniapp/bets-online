"use client"

import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {UserIcon, LogOutIcon, LayoutDashboardIcon} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import ROUTER from "@/routes";
import { Flex } from "../flex";

const HeaderIndex = () => {
    const router = useRouter()
    const { user, role, logout } = useAuth()

    const getDashboardRoute = () => {
        if (role === 'ADMIN' || role === 'OWNER') return ROUTER.ADMIN_DASHBOARD
        if (role === 'CASHIER') return ROUTER.CASHIER_DASHBOARD
        return ROUTER.USER_DASHBOARD
    }

    return (
        <header className="flex justify-between px-4 py-3 border-b border-primary/20 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
            <Flex className="items-center justify-center">
                <img src="/logo-small.png" alt="Logo" className="h-8 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="font-black text-xl tracking-tight text-primary select-none hidden" id="logo-fallback">CASINO</span>
            </Flex>
            <nav className="flex items-center gap-2">
                {user ? (
                    <>
                        <Button variant='ghost' onClick={() => router.push(getDashboardRoute())} role='button' aria-label='ir al panel'>
                            <LayoutDashboardIcon />
                            <span className="hidden sm:inline">{user.username ?? 'Panel'}</span>
                        </Button>
                        <Button variant='ghost' onClick={logout} role='button' aria-label='cerrar sesion'>
                            <LogOutIcon />
                            <span className="hidden sm:inline">Salir</span>
                        </Button>
                    </>
                ) : (
                    <Button variant='ghost' onClick={() => router.push(ROUTER.LOGIN)} role='button' aria-label='ingresar'>
                        <UserIcon />
                        <span className="hidden sm:inline">Ingresar</span>
                    </Button>
                )}
            </nav>
        </header>
    )
}
export default HeaderIndex;