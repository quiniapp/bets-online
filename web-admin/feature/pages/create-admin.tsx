"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiService } from "@/services/api.service"
import { useToast } from "@/hooks/use-toast"
import { ValidatedInput } from "@/components/ui/validated-input"
import { PasswordInput } from "@/components/ui/password-input"
import { useChips } from "@/hooks/useChips"
import { useAuth } from "@/contexts/auth-context"
import { UserRole } from "helper"

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000]

export default function CreateAdminFeature() {
  const router = useRouter()
  const { toast } = useToast()
  const { balance, loadBalance } = useChips()
  const { role: myRole } = useAuth()
  const isOwner = myRole === UserRole.OWNER
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    initialBalance: "",
    role: "ADMIN"
  })

  useState(() => { loadBalance() })

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
    if (!email.trim()) return { state: 'neutral' as const, message: '' }
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

  const parsedBalance = parseFloat(formData.initialBalance) || 0
  const maxBalance = balance?.chipBalance ?? 0
  const balanceExceeds = !isOwner && parsedBalance > maxBalance

  const handlePasswordValidationChange = useCallback((isValid: boolean) => {
    setPasswordValid(isValid)
  }, [])

  const isFormValid = () => {
    return (
      usernameValidation.state === 'valid' &&
      (emailValidation.state === 'valid' || emailValidation.state === 'neutral') &&
      passwordValid &&
      confirmPasswordValidation.state === 'valid' &&
      !balanceExceeds
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
        role: formData.role
      }

      if (formData.email.trim()) {
        payload.email = formData.email
      }
      if (formData.firstName.trim()) {
        payload.firstName = formData.firstName
      }
      if (formData.lastName.trim()) {
        payload.lastName = formData.lastName
      }
      if (parsedBalance > 0) {
        payload.initialBalance = parsedBalance
      }

      const response = await apiService.post('/users', payload)

      if (response.success) {
        toast({
          title: "Administrador creado",
          description: "El administrador ha sido creado exitosamente"
        })

        router.push('/admin/users?refresh=true')
        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Error al crear administrador",
          description: response.error?.message || "Ocurrio un error al crear el administrador"
        })
      }
    } catch (error) {
      console.error("Error creating admin:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrio un error inesperado. Por favor intente nuevamente."
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
                <Label htmlFor="username">Nombre de Usuario *</Label>
                <ValidatedInput
                  id="username"
                  placeholder="admin123"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  onBlur={() => handleBlur('username')}
                  validationState={touched.username ? usernameValidation.state : 'neutral'}
                  errorMessage={usernameValidation.message}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">Nombre (opcional)</Label>
                  <ValidatedInput
                    id="firstName"
                    placeholder="Juan"
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    validationState={formData.firstName ? 'valid' : 'neutral'}
                    showValidationIcon={false}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Apellido (opcional)</Label>
                  <ValidatedInput
                    id="lastName"
                    placeholder="Perez"
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    validationState={formData.lastName ? 'valid' : 'neutral'}
                    showValidationIcon={false}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <ValidatedInput
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={() => handleBlur('email')}
                  validationState={touched.email ? emailValidation.state : 'neutral'}
                  errorMessage={emailValidation.message}
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
                <Label htmlFor="password">Contrasena *</Label>
                <PasswordInput
                  id="password"
                  placeholder="Ingresa la contrasena"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => handleBlur('password')}
                  showRequirements={true}
                  onValidationChange={handlePasswordValidationChange}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmar Contrasena *</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Repite la contrasena"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  showRequirements={false}
                />
                {touched.confirmPassword && confirmPasswordValidation.state === 'invalid' && (
                  <p className="text-sm text-red-500">{confirmPasswordValidation.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>
                  Saldo inicial (opcional)
                  {!isOwner && balance && (
                    <span className="ml-2 text-xs text-muted-foreground">Tu saldo: ${balance.chipBalance.toLocaleString('es-AR')}</span>
                  )}
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                  {PRESET_AMOUNTS.map(preset => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs font-semibold px-1"
                      onClick={() => {
                        const current = parseFloat(formData.initialBalance.replace(',', '.')) || 0
                        handleChange("initialBalance", String(current + preset))
                      }}
                    >
                      +{preset.toLocaleString('es-AR')}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.initialBalance}
                  onChange={e => handleChange("initialBalance", e.target.value)}
                  placeholder="0.00"
                  className={balanceExceeds ? "border-red-500" : ""}
                />
                {balanceExceeds && (
                  <p className="text-sm text-red-500">El saldo inicial no puede superar tu saldo disponible</p>
                )}
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
