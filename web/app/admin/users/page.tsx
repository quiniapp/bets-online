"use client"

import { useState, useEffect, Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useUsers } from "@/hooks/useUsers"
import { Search, Edit, Ban, CheckCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { UserStatus } from "helper"
import ROUTER from "@/routes"

function UsersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const { users, loading, blockUser, unblockUser, reload } = useUsers()

  // Reload users when refresh param is present
  useEffect(() => {
    if (searchParams.get('refresh') === 'true') {
      reload()
      // Clean up the URL
      router.replace('/admin/users')
    }
  }, [searchParams, reload, router])

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleToggleUserStatus = async (userId: string, currentStatus: UserStatus) => {
    try {
      if (currentStatus === UserStatus.ACTIVE) {
        await blockUser(userId)
      } else {
        await unblockUser(userId)
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error)
    }
  }

  const handleEditUser = (userId: string) => {
    router.push(`${ROUTER.EDIT_USER}?id=${userId}`)
  }

  if (loading) {
    return (
      <DashboardLayout title="Lista de Usuarios">
        <div className="text-center py-8">Cargando usuarios...</div>
      </DashboardLayout>
    )
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

      <Card>
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm">
          <div className="col-span-2">Usuario</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-1">Rol</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-2">Registro</div>
          <div className="col-span-2">Última Act.</div>
          <div className="col-span-1">Acciones</div>
        </div>

        {/* Table Body */}
        <div className="divide-y">
          {filteredUsers.map((user) => (
            <div key={user.id} className="grid grid-cols-12 gap-4 p-4 transition-colors">
              <div className="col-span-2">
                <div className="font-semibold">{user.username}</div>
              </div>
              <div className="col-span-3">
                <div className="text-sm text-gray-600">{user.email}</div>
              </div>
              <div className="col-span-1">
                <Badge variant="outline">{user.role}</Badge>
              </div>
              <div className="col-span-1">
                <Badge variant={user.status === UserStatus.ACTIVE ? "default" : "secondary"}>
                  {user.status}
                </Badge>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-600">
                  {new Date(user.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="col-span-1">
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => handleEditUser(user.id)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={user.status === UserStatus.ACTIVE ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleUserStatus(user.id, user.status)}
                  >
                    {user.status === UserStatus.ACTIVE ?
                      <Ban className="h-3 w-3" /> :
                      <CheckCircle className="h-3 w-3" />
                    }
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No se encontraron usuarios que coincidan con la búsqueda.
            </p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}

export default function AdminUsers() {
  return (
    <Suspense fallback={
      <DashboardLayout title="Lista de Usuarios">
        <div className="text-center py-8">Cargando usuarios...</div>
      </DashboardLayout>
    }>
      <UsersPageContent />
    </Suspense>
  )
}
