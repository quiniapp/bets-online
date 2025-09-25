"use client"

import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { mockGames, type User } from "@/lib/mock-data"
import { ArrowLeft, Save, UserIcon, Activity, Users, CreditCard, Upload, Gamepad2, Bell } from "lucide-react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function UserProfile() {
  const { user, role } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [showBalance, setShowBalance] = useState(true)
  const [activeSection, setActiveSection] = useState("estadisticas")
  const [formData, setFormData] = useState({
    username: "",
    email: "",
  })

  useEffect(() => {
    if (role !== "user") {
      router.push("/user/login")
    } else if (user) {
      setFormData({
        username: user.username,
        email: user.email,
      })
    }
  }, [role, user, router])

  if (role !== "user" || !user) return null

  const currentUser = user as User

  const handleSave = () => {
    console.log("Saving profile:", formData)
    setIsEditing(false)
  }

  const getGameName = (gameId: string) => {
    return mockGames.find((g) => g.id === gameId)?.name || "Juego desconocido"
  }

  const recentActivity = [
    { action: "Login", timestamp: new Date(Date.now() - 1000 * 60 * 30), ip: "192.168.1.1" },
    { action: "Bet Placed", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), ip: "192.168.1.1" },
    { action: "Profile Updated", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), ip: "192.168.1.1" },
  ]

  const sidebarItems = [
    { id: "estadisticas", label: "Estadísticas", icon: Activity },

    { id: "cuenta", label: "Cuenta corriente", icon: CreditCard },

    { id: "datos", label: "Datos Personales", icon: UserIcon },
    { id: "juegos", label: "Juegos Habilitados / Información", icon: Gamepad2 },
    { id: "eventos", label: "Eventos", icon: Bell },
  ]

  const userStats = {
    fichas: currentUser.balance,
    jugado: 1250.5,
    ganado: 980.25,
    netLoss: 270.25,
    mesPasado: 450.75,
  }

  const renderContent = () => {
    switch (activeSection) {
      case "estadisticas":
        return (
          <div className="space-y-6">
            {/* Statistics Table */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Estadísticas</h3>
                  <div className="mb-4">
                    <span className="text-lg font-medium">Fichas: </span>
                    <span className="text-xl font-bold">{userStats.fichas.toFixed(2)}</span>
                  </div>
                </div>

                {/* Stats Table with divs */}
                <div className="bg-muted/50 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-2 gap-0">
                    <div className="bg-slate-700 text-white p-3 font-medium">Jugado:</div>
                    <div className="bg-background p-3 text-right font-medium">{userStats.jugado.toFixed(2)}</div>

                    <div className="bg-slate-700 text-white p-3 font-medium">Ganado:</div>
                    <div className="bg-background p-3 text-right font-medium">{userStats.ganado.toFixed(2)}</div>

                    <div className="bg-slate-700 text-white p-3 font-medium">NetLoss:</div>
                    <div className="bg-background p-3 text-right font-medium">{userStats.netLoss.toFixed(2)}</div>

                    <div className="bg-slate-700 text-white p-3 font-medium">Mes pasado:</div>
                    <div className="bg-background p-3 text-right font-medium">{userStats.mesPasado.toFixed(2)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "datos":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Datos Personales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Usuario</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                >
                  {isEditing ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </>
                  ) : (
                    "Editar"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      case "juegos":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Juegos Habilitados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentUser.enabledGames.length > 0 ? (
                  currentUser.enabledGames.map((gameId) => {
                    const game = mockGames.find((g) => g.id === gameId)
                    return (
                      <div key={gameId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{getGameName(gameId)}</p>
                          {game && (
                            <p className="text-sm text-muted-foreground">
                              ${game.minBet} - ${game.maxBet}
                            </p>
                          )}
                        </div>
                        <Badge variant="default">Activo</Badge>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-muted-foreground text-center py-4">No tienes acceso a ningún juego</p>
                )}
              </div>
            </CardContent>
          </Card>
        )

      case "eventos":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Registro de Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">IP: {activity.ip}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">{activity.timestamp.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )

      default:
        return (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center">Sección en desarrollo</p>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <DashboardLayout title="Mi Perfil">

    <div className="min-h-screen bg-background">
       

      <div className="flex">
        <aside className="w-64 bg-background border-r min-h-screen">
          <nav className="p-4">
            <ul className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                        activeSection === item.id
                          ? "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 flex">
          <div className="flex-1 p-6">{renderContent()}</div>

          {/* Right sidebar with user info */}
          <aside className="w-64 bg-muted/30 p-4 border-l">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Moneda:</Label>
                <p className="text-lg font-semibold">ARS</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Estado:</Label>
                <div className="mt-1">
                  <Badge variant={currentUser.isActive ? "default" : "secondary"} className="bg-green-500">
                    {currentUser.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Último ingreso:</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}{" "}
                  {new Date().toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  hs
                </p>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
    </DashboardLayout>
  )
}
