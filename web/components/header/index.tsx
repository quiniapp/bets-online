"use client"

import { useState } from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {UserIcon, LogOutIcon, LayoutDashboardIcon} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import ROUTER from "@/routes";
import { Flex } from "../flex";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

const HeaderIndex = () => {
    const router = useRouter()
    const { user, role, logout } = useAuth()
    const [logoutOpen, setLogoutOpen] = useState(false)

    const getDashboardRoute = () => {
        if (role === 'ADMIN' || role === 'OWNER') return ROUTER.ADMIN_DASHBOARD
        if (role === 'CASHIER') return ROUTER.CASHIER_DASHBOARD
        return ROUTER.USER_DASHBOARD
    }

    return (
        <>
        <header className="flex justify-between px-4 py-3 border-b border-primary/20 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
            <Flex className="items-center justify-center">
                <img src="/logo-small.png" alt="Logo" className="h-14 w-auto max-w-[160px]" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="font-black text-xl tracking-tight text-primary select-none hidden" id="logo-fallback">CASINO</span>
            </Flex>
            <nav className="flex items-center gap-2">
                {user ? (
                    <>
                        <Button variant='ghost' onClick={() => router.push(getDashboardRoute())} role='button' aria-label='ir al panel'>
                            <LayoutDashboardIcon />
                            <span className="hidden sm:inline">{user.username ?? 'Panel'}</span>
                        </Button>
                        <Button onClick={() => setLogoutOpen(true)} role='button' aria-label='cerrar sesion' className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold">
                            <LogOutIcon />
                            Salir
                        </Button>
                    </>
                ) : (
                    <Button onClick={() => router.push(ROUTER.LOGIN)} role='button' aria-label='ingresar' className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold">
                        <UserIcon />
                        <span>Ingresar</span>
                    </Button>
                )}
            </nav>
        </header>

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