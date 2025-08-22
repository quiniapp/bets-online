"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DashboardLayout } from "@/components/dashboard-layout"
import { mockUsers, mockGames, type User } from "@/lib/mock-data"
import { Search, Edit, Ban, CheckCircle } from "lucide-react"

export default function AdminUsers() {
  const { role } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState<User[]>(mockUsers)

  useEffect(() => {
    if (role !== "admin") {
      router.push("/admin/login")
    }
  }, [role, router])

  if (role !== "admin") return null

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, isActive: !user.isActive } : user)))
  }

  const getGameName = (gameId: string) => {
    return mockGames.find((g) => g.id === gameId)?.name || "Juego desconocido"
  }

  return (
    <DashboardLayout title="Lista de Usuarios">
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar usuarios por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b font-medium text-sm text-gray-700">
          <div className="col-span-2">Usuario</div>
          <div className="col-span-2">Email</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-2">Balance</div>
          <div className="col-span-2">Registro</div>
          <div className="col-span-2">Juegos</div>
          <div className="col-span-1">Acciones</div>
        </div>

        {/* Table Body */}
        <div className="divide-y">
          {filteredUsers.map((user) => (
            <div key={user.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors">
              <div className="col-span-2">
                <div className="font-semibold">{user.username}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-600">{user.email}</div>
              </div>
              <div className="col-span-1">
                <Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Activo" : "Inactivo"}</Badge>
              </div>
              <div className="col-span-2">
                <div className="font-semibold text-green-600">${user.balance.toFixed(2)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-600">{user.createdAt.toLocaleDateString()}</div>
              </div>
              <div className="col-span-2">
                <div className="flex flex-wrap gap-1">
                  {user.enabledGames.length > 0 ? (
                    user.enabledGames.slice(0, 2).map((gameId) => (
                      <Badge key={gameId} variant="outline" className="text-xs">
                        {getGameName(gameId)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">Sin juegos</span>
                  )}
                  {user.enabledGames.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{user.enabledGames.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="col-span-1">
                <div className="flex gap-1">
                  <Button variant="outline" size="sm">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={user.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleUserStatus(user.id)}
                  >
                    {user.isActive ? <Ban className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No se encontraron usuarios que coincidan con la búsqueda.</p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}
