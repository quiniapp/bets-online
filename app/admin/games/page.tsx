"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { mockGames, type Game } from "@/lib/mock-data"
import { ArrowLeft, Edit, ToggleLeft, ToggleRight } from "lucide-react"
import Link from "next/link"

export default function AdminGames() {
  const { role } = useAuth()
  const router = useRouter()
  const [games, setGames] = useState<Game[]>(mockGames)

  useEffect(() => {
    if (role !== "admin") {
      router.push("/admin/login")
    }
  }, [role, router])

  if (role !== "admin") return null

  const toggleGameStatus = (gameId: string) => {
    setGames((prev) => prev.map((game) => (game.id === gameId ? { ...game, isActive: !game.isActive } : game)))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Juegos</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card key={game.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{game.name}</CardTitle>
                  <Badge variant={game.isActive ? "default" : "secondary"}>
                    {game.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{game.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Apuesta mínima:</span>
                    <span className="font-medium">${game.minBet.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Apuesta máxima:</span>
                    <span className="font-medium">${game.maxBet.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant={game.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleGameStatus(game.id)}
                    className="flex-1"
                  >
                    {game.isActive ? (
                      <>
                        <ToggleLeft className="h-4 w-4 mr-2" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <ToggleRight className="h-4 w-4 mr-2" />
                        Activar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
