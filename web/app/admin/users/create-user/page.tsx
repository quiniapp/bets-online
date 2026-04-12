"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ValidatedInput } from "@/components/ui/validated-input"
import { PasswordInput } from "@/components/ui/password-input"
import { Save, User } from "lucide-react"
import { apiService } from "@/services/api.service"
import { useToast } from "@/hooks/use-toast"

export default function CreateUserPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    initialBalance: "0",
    isActive: true,
  })

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [passwordValid, setPasswordValid] = useState(false)

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const validateUsername = (username: string) => {
    if (!username.trim()) return { state: 'invalid' as const, message: 'El nombre de usuario es requerido' }
    if (username.length < 3) return { state: 'invalid' as const, message: 'Minimo 3 caracteres' }
    return { state: 'valid' as const, message: '' }
  }

  const validateEmail = (email: string) => {
    if (!email.trim()) return { state: 'neutral' as const, message: '' } // Email is optional
    if (!/\S+@\S+\.\S+/.test(email)) return { state: 'invalid' as const, message: 'El email no es valido' }
    return { state: 'valid' as const, message: '' }
  }

  const validateConfirmPassword = (confirmPassword: string, password: string) => {
    if (!confirmPassword) return { state: 'neutral' as const, message: '' }
    if (confirmPassword !== password) return { state: 'invalid' as const, message: 'Las contrasenas no coinciden' }
    return { state: 'valid' as const, message: '' }
  }

  const usernameValidation = validateUsername(formData.username)
  const emailValidation = validateEmail(formData.email)
  const confirmPasswordValidation = validateConfirmPassword(formData.confirmPassword, formData.password)

  const handlePasswordValidationChange = useCallback((isValid: boolean) => {
    setPasswordValid(isValid)
  }, [])

  const isFormValid = () => {
    return (
      usernameValidation.state === 'valid' &&
      (emailValidation.state === 'valid' || emailValidation.state === 'neutral') &&
      passwordValid &&
      confirmPasswordValidation.state === 'valid'
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all fields as touched
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    })

    if (!isFormValid()) {
      toast({
        variant: "destructive",
        title: "Error de validacion",
        description: "Por favor corrige los errores en el formulario"
      })
      return
    }

    setIsLoading(true)

    try {
      const payload: Record<string, unknown> = {
        username: formData.username,
        password: formData.password,
        role: 'PLAYER'
      }

      // Only include optional fields if they have values
      if (formData.email.trim()) {
        payload.email = formData.email
      }
      if (formData.firstName.trim()) {
        payload.firstName = formData.firstName
      }
      if (formData.lastName.trim()) {
        payload.lastName = formData.lastName
      }

      const response = await apiService.post('/users', payload)

      if (response.success) {
        toast({
          title: "Usuario creado",
          description: "El usuario ha sido creado exitosamente"
        })

        router.push('/admin/users?refresh=true')
        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Error al crear usuario",
          description: response.error?.message || "Ocurrio un error al crear el usuario"
        })
      }
    } catch (error) {
      console.error("Error creating user:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrio un error inesperado. Por favor intente nuevamente."
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">

          <div>
            <h1 className="text-3xl font-bold">Crear Nuevo Usuario</h1>
            <p className="text-muted-foreground">Registra un nuevo usuario en el sistema</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Informacion Basica
                </CardTitle>
                <CardDescription>Datos principales del usuario</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de Usuario *</Label>
                  <ValidatedInput
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                    onBlur={() => handleBlur('username')}
                    placeholder="Ingresa el nombre de usuario"
                    validationState={touched.username ? usernameValidation.state : 'neutral'}
                    errorMessage={usernameValidation.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre (opcional)</Label>
                    <ValidatedInput
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Nombre"
                      validationState={formData.firstName ? 'valid' : 'neutral'}
                      showValidationIcon={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido (opcional)</Label>
                    <ValidatedInput
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Apellido"
                      validationState={formData.lastName ? 'valid' : 'neutral'}
                      showValidationIcon={false}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (opcional)</Label>
                  <ValidatedInput
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    onBlur={() => handleBlur('email')}
                    placeholder="usuario@ejemplo.com"
                    validationState={touched.email ? emailValidation.state : 'neutral'}
                    errorMessage={emailValidation.message}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contrasena *</Label>
                  <PasswordInput
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    onBlur={() => handleBlur('password')}
                    placeholder="Ingresa la contrasena"
                    showRequirements={true}
                    onValidationChange={handlePasswordValidationChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contrasena *</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    onBlur={() => handleBlur('confirmPassword')}
                    placeholder="Repite la contrasena"
                    showRequirements={false}
                  />
                  {touched.confirmPassword && confirmPasswordValidation.state === 'invalid' && (
                    <p className="text-sm text-red-500">{confirmPasswordValidation.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Configuracion de Cuenta</CardTitle>
                <CardDescription>Balance inicial y permisos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="initialBalance">Balance Inicial ($)</Label>
                  <ValidatedInput
                    id="initialBalance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData((prev) => ({ ...prev, initialBalance: e.target.value }))}
                    placeholder="0.00"
                    showValidationIcon={false}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked as boolean }))}
                  />
                  <Label htmlFor="isActive">Usuario activo</Label>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Creando..." : "Crear Usuario"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  )
}
