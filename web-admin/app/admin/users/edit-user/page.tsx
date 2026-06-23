"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Save, UserCog } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { apiService } from "@/services/api.service"
import { useToast } from "@/hooks/use-toast"
import { ValidatedInput } from "@/components/ui/validated-input"
import { PasswordInput } from "@/components/ui/password-input"

function EditUserForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const userId = searchParams.get('id')

  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [passwordValid, setPasswordValid] = useState(true)

  useEffect(() => {
    if (!userId) { router.push('/admin/users'); return }
    const load = async () => {
      setIsFetching(true)
      try {
        const response = await apiService.get<{ id: string; username: string; email?: string; firstName?: string; lastName?: string }>(`/users/${userId}`)
        if (response.success && response.data) {
          setFormData(prev => ({
            ...prev,
            username: response.data!.username ?? "",
            email: response.data!.email ?? "",
            firstName: response.data!.firstName ?? "",
            lastName: response.data!.lastName ?? "",
          }))
        } else {
          toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el usuario" })
          router.push('/admin/users')
        }
      } catch {
        toast({ variant: "destructive", title: "Error", description: "Error inesperado cargando usuario" })
        router.push('/admin/users')
      } finally {
        setIsFetching(false)
      }
    }
    load()
  }, [userId])

  const handleBlur = (field: string) => setTouched(prev => ({ ...prev, [field]: true }))

  const validateEmail = (v: string) => {
    if (!v.trim()) return { state: 'neutral' as const, message: '' }
    if (!/\S+@\S+\.\S+/.test(v)) return { state: 'invalid' as const, message: 'Email no válido' }
    return { state: 'valid' as const, message: '' }
  }

  const validateConfirmPassword = (v: string) => {
    if (!formData.password && !v) return { state: 'neutral' as const, message: '' }
    if (!v && formData.password) return { state: 'invalid' as const, message: 'Confirma la nueva contraseña' }
    if (v !== formData.password) return { state: 'invalid' as const, message: 'Las contraseñas no coinciden' }
    return { state: 'valid' as const, message: '' }
  }

  const emailValidation = validateEmail(formData.email)
  const confirmValidation = validateConfirmPassword(formData.confirmPassword)

  const passwordEntered = formData.password.length > 0
  const isFormValid =
    (emailValidation.state === 'valid' || emailValidation.state === 'neutral') &&
    (!passwordEntered || (passwordValid && confirmValidation.state === 'valid')) &&
    (passwordEntered ? confirmValidation.state === 'valid' : true)

  const handlePasswordValidationChange = useCallback((v: boolean) => setPasswordValid(v), [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true, confirmPassword: true })
    if (!isFormValid) {
      toast({ variant: "destructive", title: "Error de validación", description: "Corrige los errores del formulario" })
      return
    }
    setIsLoading(true)
    try {
      const payload: Record<string, unknown> = {}
      if (formData.email.trim()) payload.email = formData.email
      else payload.email = null
      if (formData.firstName.trim()) payload.firstName = formData.firstName
      else payload.firstName = null
      if (formData.lastName.trim()) payload.lastName = formData.lastName
      else payload.lastName = null
      if (formData.password) payload.password = formData.password.trim()

      const response = await apiService.patch(`/users/${userId}`, payload)
      if (response.success) {
        toast({ title: "Usuario actualizado", description: "Los datos fueron guardados correctamente" })
        router.push('/admin/users')
      } else {
        toast({ variant: "destructive", title: "Error", description: response.error?.message || "No se pudo actualizar el usuario" })
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Error inesperado. Intente nuevamente." })
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <DashboardLayout title="Editar Usuario">
        <div className="text-center py-8 text-muted-foreground">Cargando usuario...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Editar Usuario">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Datos del Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de Usuario</Label>
              <Input
                value={formData.username}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">El nombre de usuario no puede modificarse.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre (opcional)</Label>
                <ValidatedInput
                  value={formData.firstName}
                  onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                  placeholder="Nombre"
                  validationState={formData.firstName ? 'valid' : 'neutral'}
                  showValidationIcon={false}
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido (opcional)</Label>
                <ValidatedInput
                  value={formData.lastName}
                  onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                  placeholder="Apellido"
                  validationState={formData.lastName ? 'valid' : 'neutral'}
                  showValidationIcon={false}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email (opcional)</Label>
              <ValidatedInput
                type="email"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                onBlur={() => handleBlur('email')}
                placeholder="usuario@ejemplo.com"
                validationState={touched.email ? emailValidation.state : 'neutral'}
                errorMessage={emailValidation.message}
              />
            </div>

            <div className="space-y-2">
              <Label>Nueva Contraseña (opcional)</Label>
              <PasswordInput
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                onBlur={() => handleBlur('password')}
                placeholder="Dejar vacío para no cambiar"
                showRequirements={formData.password.length > 0}
                onValidationChange={handlePasswordValidationChange}
              />
            </div>

            {formData.password.length > 0 && (
              <div className="space-y-2">
                <Label>Confirmar Nueva Contraseña</Label>
                <PasswordInput
                  value={formData.confirmPassword}
                  onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                  onBlur={() => handleBlur('confirmPassword')}
                  placeholder="Repite la nueva contraseña"
                  showRequirements={false}
                />
                {touched.confirmPassword && confirmValidation.state === 'invalid' && (
                  <p className="text-sm text-red-500">{confirmValidation.message}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || !isFormValid}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  )
}

export default function EditUserPage() {
  return (
    <Suspense fallback={
      <DashboardLayout title="Editar Usuario">
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      </DashboardLayout>
    }>
      <EditUserForm />
    </Suspense>
  )
}
