"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"
import { UserRole } from "helper"
import {
  UserIcon,
  Gamepad2,
  Loader2,
  Wallet,
  Heart,
} from "lucide-react"
import Link from "next/link"
import ROUTER from "@/routes"
import { useChips } from "@/hooks/useChips"
import { useFavorites } from "@/contexts/favorites-context"

export default function UserDashboard() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()
  const { balance, loadBalance } = useChips()
  const { favoriteGames, loading: loadingFavorites } = useFavorites()

  useEffect(() => {
    if (!isLoading) {
      if (role !== UserRole.PLAYER) {
        router.push(ROUTER.SITE)
      }
    }
  }, [role, router, isLoading])

  useEffect(() => {
    if (user && role === UserRole.PLAYER) {
      loadBalance()
    }
  }, [user, role])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (role !== UserRole.PLAYER || !user) {
    return null
  }

  return (
    <DashboardLayout title="Inicio">
      {/* Balance Hero */}
      <div className="mb-5 rounded-2xl bg-primary/10 border border-primary/20 p-5 md:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Balance disponible</p>
            {balance ? (
              <p className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
                ${balance.chipBalance.toFixed(2)}
              </p>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cargando...</span>
              </div>
            )}
            {balance && (
              <p className="text-xs text-muted-foreground mt-2">
                Actualizado: {new Date(balance.lastUpdatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="p-3 rounded-xl bg-primary/15">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link href="/user/profile" className="flex-1">
          <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-center">
            <div className="p-2 rounded-lg bg-muted">
              <UserIcon className="h-5 w-5 text-foreground" />
            </div>
            <span className="text-xs font-medium leading-tight">Mi Perfil</span>
          </div>
        </Link>
        <Link href="/user/games" className="flex-1">
          <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-primary border border-primary hover:opacity-90 transition-opacity text-center">
            <div className="p-2 rounded-lg bg-primary-foreground/20">
              <Gamepad2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold text-primary-foreground leading-tight">Jugar</span>
          </div>
        </Link>
      </div>

      {/* Favorites */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Favoritos</CardTitle>
            <Link href="/user/games">
              <Button variant="ghost" size="sm" className="text-primary text-xs">
                Ver todos
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingFavorites ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : favoriteGames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
              <Heart className="h-10 w-10 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">No tenés favoritos aún</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Marcá juegos con ♥ para verlos acá</p>
              </div>
              <Link href="/user/games">
                <Button size="sm" variant="outline" className="mt-1">
                  Explorar juegos
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {favoriteGames.map((game) => (
                <Link
                  key={game.id}
                  href={game.providerGameId ? `/user/games/${game.id}/play` : "/user/games"}
                >
                  <div className="group rounded-xl border border-border overflow-hidden hover:border-primary/40 transition-colors cursor-pointer">
                    {game.defaultLogo ? (
                      <img
                        src={game.defaultLogo}
                        alt={game.name}
                        className="w-full h-20 md:h-24 object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-20 md:h-24 bg-muted flex items-center justify-center">
                        <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-2.5">
                      <p className="text-xs font-semibold truncate">{game.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Min: ${game.minBet}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
