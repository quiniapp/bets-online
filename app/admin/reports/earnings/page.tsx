"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardLayout } from "@/components/dashboard-layout"
import { mockUsers, mockBets, mockGames, type User } from "@/lib/mock-data"
import { Search, TrendingUp, TrendingDown, DollarSign } from "lucide-react"

export default function EarningsReport() {
  const { role } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("all")
  const [selectedGame, setSelectedGame] = useState("all")
  const [showAllGames, setShowAllGames] = useState(false)

  useEffect(() => {
    if (role !== "admin") {
      router.push("/admin/login")
    }
  }, [role, router])

  if (role !== "admin") return null

  const filteredUsers = mockUsers.filter(
    (user) => searchTerm === "" || user.username.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getUserBets = (userId: string) => {
    return mockBets.filter((bet) => bet.userId === userId)
  }

  const calculateUserStats = (user: User) => {
    const userBets = getUserBets(user.id)
    const totalPlayed = userBets.reduce((sum, bet) => sum + bet.amount, 0)
    const totalWon = userBets.filter((bet) => bet.outcome === "won").reduce((sum, bet) => sum + (bet.payout || 0), 0)
    const netLoss = totalPlayed - totalWon

    return { totalPlayed, totalWon, netLoss }
  }

  const totalStats = filteredUsers.reduce(
    (acc, user) => {
      const stats = calculateUserStats(user)
      return {
        totalPlayed: acc.totalPlayed + stats.totalPlayed,
        totalWon: acc.totalWon + stats.totalWon,
        netLoss: acc.netLoss + stats.netLoss,
      }
    },
    { totalPlayed: 0, totalWon: 0, netLoss: 0 },
  )

  return (
    <DashboardLayout title="Reporte de Ganancias">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fichas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalStats.totalPlayed.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">total apostado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NetLoss</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalStats.netLoss.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">ganancia neta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mes pasado</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalStats.netLoss * 0.85).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">comparativo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Lista de Usuarios</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar usuario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {mockUsers.slice(0, 20).map((user) => (
                  <div key={user.id} className="p-3 border-b hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">{user.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="dateFrom">Desde...</Label>
                  <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="dateTo">Hasta...</Label>
                  <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div>
                  <Label>Filtro por agente</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar agente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los agentes</SelectItem>
                      <SelectItem value="agent1">Agente 1</SelectItem>
                      <SelectItem value="agent2">Agente 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Agrupar Jugadores</Label>
                  <div className="relative">
                    <Select value={selectedGame} onValueChange={setSelectedGame}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los juegos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los juegos</SelectItem>
                        {mockGames.map((game) => (
                          <SelectItem key={game.id} value={game.id}>
                            {game.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button>Ver resultados</Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-800 text-white font-medium text-sm">
                <div>Jugador</div>
                <div>Gerente</div>
                <div>Jugado</div>
                <div>Ganado</div>
              </div>

              {/* Table Body */}
              <div className="divide-y">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const stats = calculateUserStats(user)
                    return (
                      <div key={user.id} className="grid grid-cols-4 gap-4 p-4 hover:bg-gray-50">
                        <div className="font-medium">{user.username}</div>
                        <div className="text-gray-600">Admin</div>
                        <div className="font-semibold">${stats.totalPlayed.toFixed(2)}</div>
                        <div className="font-semibold text-green-600">${stats.totalWon.toFixed(2)}</div>
                      </div>
                    )
                  })
                ) : (
                  <div className="p-8 text-center text-gray-500">Ningún dato disponible en esta tabla</div>
                )}
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center p-4 border-t bg-gray-50">
                <div className="text-sm text-gray-600">Mostrando registros del 0 a 0 de un total de 0 registros</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
