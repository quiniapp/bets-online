"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Shield, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function CreateManagerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "El nombre de usuario es requerido";
    } else if (formData.username.length < 3) {
      newErrors.username =
        "El nombre de usuario debe tener al menos 3 caracteres";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "El email no es válido";
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    const hasPermissions = Object.values(formData.permissions).some(
      (permission) => permission
    );
    if (!hasPermissions) {
      newErrors.permissions = "Debe seleccionar al menos un permiso";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    console.log("Creating manager:", formData);
    alert("Gerente creado exitosamente");
    router.push("/admin/users");
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
    viewReports: "Acceso a reportes y estadísticas",
    manageBalances: "Ajustar balances de usuarios",
    systemSettings: "Configuraciones del sistema",
  };

  const permissionLabels = {
    manageUsers: "Gestión de Usuarios",
    manageGames: "Gestión de Juegos",
    manageTransactions: "Gestión de Transacciones",
    viewReports: "Ver Reportes",
    manageBalances: "Gestión de Balances",
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

          {/* Warning Alert */}
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                    Importante
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Los gerentes tendrán acceso a funciones administrativas
                    sensibles. Asegúrate de otorgar solo los permisos
                    necesarios.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Información Básica
                  </CardTitle>
                  <CardDescription>
                    Datos principales del gerente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Nombre de Usuario</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      placeholder="Ingresa el nombre de usuario"
                      className={errors.username ? "border-red-500" : ""}
                    />
                    {errors.username && (
                      <p className="text-sm text-red-500">{errors.username}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="gerente@ejemplo.com"
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Mínimo 8 caracteres"
                      className={errors.password ? "border-red-500" : ""}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-500">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirmar Contraseña
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="Repite la contraseña"
                      className={errors.confirmPassword ? "border-red-500" : ""}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-500">
                        {errors.confirmPassword}
                      </p>
                    )}
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
                    Selecciona los permisos que tendrá este gerente
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
                  {errors.permissions && (
                    <p className="text-sm text-red-500">{errors.permissions}</p>
                  )}
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
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Crear Gerente
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
