"use client"

import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {UserIcon, LogOutIcon, LayoutDashboardIcon} from "lucide-react";
import { ThemeToggle } from "../theme-toggle";
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
        <header className="flex justify-between p-4 border-b-1">
            <Flex className="items-center justify-center"> logo </Flex>
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
                <ThemeToggle />
            </nav>
        </header>
    )
}
export default HeaderIndex;