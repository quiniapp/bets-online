"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiService } from "@/services/api.service"
import { useToast } from "@/hooks/use-toast"

export default function CreateAdminFeature() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "ADMIN"
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: "Las contraseñas no coinciden"
      })
      return
    }

    // Validate password length
    if (formData.password.length < 8) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: "La contraseña debe tener al menos 8 caracteres"
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await apiService.post('/users', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role
      })

      if (response.success) {
        toast({
          title: "Administrador creado",
          description: "El administrador ha sido creado exitosamente"
        })

        // Redirect to users list with refresh param
        router.push('/admin/users?refresh=true')
        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Error al crear administrador",
          description: response.error?.message || "Ocurrió un error al crear el administrador"
        })
      }
    } catch (error) {
      console.error("Error creating admin:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado. Por favor intente nuevamente."
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            <CardTitle>Crear Nuevo Administrador</CardTitle>
          </div>
          <CardDescription>
            Complete los detalles para crear un nuevo usuario administrador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input
                  id="username"
                  placeholder="admin123"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={formData.role} onValueChange={(value) => handleChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="OWNER">Propietario</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                  minLength={8}
                />
                <p className="text-sm text-muted-foreground">
                  Mínimo 8 caracteres
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Creando..." : "Crear Administrador"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
