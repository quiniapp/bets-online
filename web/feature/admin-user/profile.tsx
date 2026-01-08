"use client"

import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Mail, Shield, Calendar } from "lucide-react"

export default function UserProfileFeature() {
  const { user, role } = useAuth()

  if (!user) {
    return (
      <DashboardLayout title="Mi Perfil">
        <div>Cargando...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Mi Perfil">
      <div className="grid gap-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {user.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{user.username}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>Detalles de tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Usuario</Label>
              <div className="flex gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <Input id="username" value={user.username || ""} disabled />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <Input id="email" value={user.email || ""} disabled />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Rol</Label>
              <div className="flex gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <Input id="role" value={role || ""} disabled />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="created">Fecha de Creación</Label>
              <div className="flex gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="created"
                  value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Cuenta</CardTitle>
            <CardDescription>Administra tu cuenta y preferencias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full">
              Cambiar Contraseña
            </Button>
            <Button variant="outline" className="w-full">
              Configurar Autenticación de Dos Factores
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
