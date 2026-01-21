"use client";

import type React from "react";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Shield } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import AlertWarning from "@/components/alerts/warning";
import { apiService } from "@/services/api.service";
import { useToast } from "@/hooks/use-toast";
import { ValidatedInput } from "@/components/ui/validated-input";
import { PasswordInput } from "@/components/ui/password-input";

export default function CreateManagerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    role: "manager" as "manager" | "admin",
    isActive: true,
    permissions: {
      manageUsers: false,
      manageGames: false,
      manageTransactions: false,
      viewReports: false,
      manageBalances: false,
      systemSettings: false,
    },
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [passwordValid, setPasswordValid] = useState(false);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const validateUsername = (username: string) => {
    if (!username.trim()) return { state: 'invalid' as const, message: 'El nombre de usuario es requerido' };
    if (username.length < 3) return { state: 'invalid' as const, message: 'Minimo 3 caracteres' };
    return { state: 'valid' as const, message: '' };
  };

  const validateEmail = (email: string) => {
    if (!email.trim()) return { state: 'neutral' as const, message: '' };
    if (!/\S+@\S+\.\S+/.test(email)) return { state: 'invalid' as const, message: 'El email no es valido' };
    return { state: 'valid' as const, message: '' };
  };

  const validateConfirmPassword = (confirmPassword: string, password: string) => {
    if (!confirmPassword) return { state: 'neutral' as const, message: '' };
    if (confirmPassword !== password) return { state: 'invalid' as const, message: 'Las contrasenas no coinciden' };
    return { state: 'valid' as const, message: '' };
  };

  const usernameValidation = validateUsername(formData.username);
  const emailValidation = validateEmail(formData.email);
  const confirmPasswordValidation = validateConfirmPassword(formData.confirmPassword, formData.password);

  const handlePasswordValidationChange = useCallback((isValid: boolean) => {
    setPasswordValid(isValid);
  }, []);

  const isFormValid = () => {
    const hasPermissions = Object.values(formData.permissions).some(p => p);
    return (
      usernameValidation.state === 'valid' &&
      (emailValidation.state === 'valid' || emailValidation.state === 'neutral') &&
      passwordValid &&
      confirmPasswordValidation.state === 'valid' &&
      hasPermissions
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    const hasPermissions = Object.values(formData.permissions).some(p => p);

    if (!isFormValid()) {
      if (!hasPermissions) {
        toast({
          variant: "destructive",
          title: "Error de validacion",
          description: "Debe seleccionar al menos un permiso"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error de validacion",
          description: "Por favor corrige los errores en el formulario"
        });
      }
      return;
    }

    setIsLoading(true);

    try {
      const role = formData.role === 'manager' ? 'CASHIER' : 'ADMIN';

      const payload: Record<string, unknown> = {
        username: formData.username,
        password: formData.password,
        role: role
      };

      if (formData.email.trim()) {
        payload.email = formData.email;
      }
      if (formData.firstName.trim()) {
        payload.firstName = formData.firstName;
      }
      if (formData.lastName.trim()) {
        payload.lastName = formData.lastName;
      }

      const response = await apiService.post('/users', payload);

      if (response.success) {
        toast({
          title: "Gerente creado",
          description: "El gerente ha sido creado exitosamente"
        });

        router.push('/admin/users?refresh=true');
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error al crear gerente",
          description: response.error?.message || "Ocurrio un error al crear el gerente"
        });
      }
    } catch (error) {
      console.error("Error creating manager:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrio un error inesperado. Por favor intente nuevamente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (
    permission: keyof typeof formData.permissions,
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: checked,
      },
    }));
  };

  const permissionDescriptions = {
    manageUsers: "Crear, editar y desactivar usuarios",
    manageGames: "Gestionar juegos y configuraciones",
    manageTransactions: "Ver y gestionar transacciones",
    viewReports: "Acceso a reportes y estadisticas",
    manageBalances: "Ajustar balances de usuarios",
    systemSettings: "Configuraciones del sistema",
  };

  const permissionLabels = {
    manageUsers: "Gestion de Usuarios",
    manageGames: "Gestion de Juegos",
    manageTransactions: "Gestion de Transacciones",
    viewReports: "Ver Reportes",
    manageBalances: "Gestion de Balances",
    systemSettings: "Configuraciones del Sistema",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-6 max-w-7xl">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Crear Nuevo Gerente</h1>
              <p className="text-muted-foreground">
                Registra un nuevo gerente con permisos administrativos
              </p>
            </div>
          </div>

          <AlertWarning title='Importante' body='Los gerentes tendran acceso a funciones administrativas
                    sensibles. Asegurate de otorgar solo los permisos
                    necesarios.' />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Informacion Basica
                  </CardTitle>
                  <CardDescription>
                    Datos principales del gerente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Nombre de Usuario *</Label>
                    <ValidatedInput
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
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
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      onBlur={() => handleBlur('email')}
                      placeholder="gerente@ejemplo.com"
                      validationState={touched.email ? emailValidation.state : 'neutral'}
                      errorMessage={emailValidation.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contrasena *</Label>
                    <PasswordInput
                      id="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      onBlur={() => handleBlur('password')}
                      placeholder="Ingresa la contrasena"
                      showRequirements={true}
                      onValidationChange={handlePasswordValidationChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirmar Contrasena *
                    </Label>
                    <ValidatedInput
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      onBlur={() => handleBlur('confirmPassword')}
                      placeholder="Repite la contrasena"
                      validationState={touched.confirmPassword ? confirmPasswordValidation.state : 'neutral'}
                      errorMessage={confirmPasswordValidation.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "manager" | "admin") =>
                        setFormData((prev) => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Gerente</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          isActive: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="isActive">Cuenta activa</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Permisos</CardTitle>
                  <CardDescription>
                    Selecciona los permisos que tendra este gerente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(formData.permissions).map(([key, value]) => (
                    <div key={key} className="flex items-start space-x-3">
                      <Checkbox
                        id={key}
                        checked={value}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(
                            key as keyof typeof formData.permissions,
                            checked as boolean
                          )
                        }
                      />
                      <div className="flex-1">
                        <Label htmlFor={key} className="font-medium">
                          {
                            permissionLabels[
                              key as keyof typeof permissionLabels
                            ]
                          }
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {
                            permissionDescriptions[
                              key as keyof typeof permissionDescriptions
                            ]
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? "Creando..." : "Crear Gerente"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
