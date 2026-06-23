"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Save, Briefcase } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { apiService } from "@/services/api.service";
import { useToast } from "@/hooks/use-toast";
import { ValidatedInput } from "@/components/ui/validated-input";
import { PasswordInput } from "@/components/ui/password-input";
import { useChips } from "@/hooks/useChips";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "helper";

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

export default function CreateCashierPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { balance, loadBalance } = useChips();
  const { role } = useAuth();
  const isOwner = role === UserRole.OWNER;
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    initialBalance: "",
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [passwordValid, setPasswordValid] = useState(false);

  useState(() => { loadBalance(); });

  const handleBlur = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const validateUsername = (v: string) => {
    if (!v.trim()) return { state: 'invalid' as const, message: 'El nombre de usuario es requerido' };
    if (v.length < 3) return { state: 'invalid' as const, message: 'Mínimo 3 caracteres' };
    return { state: 'valid' as const, message: '' };
  };

  const validateEmail = (v: string) => {
    if (!v.trim()) return { state: 'neutral' as const, message: '' };
    if (!/\S+@\S+\.\S+/.test(v)) return { state: 'invalid' as const, message: 'Email no válido' };
    return { state: 'valid' as const, message: '' };
  };

  const validateConfirmPassword = (v: string) => {
    if (!v) return { state: 'neutral' as const, message: '' };
    if (v !== formData.password) return { state: 'invalid' as const, message: 'Las contraseñas no coinciden' };
    return { state: 'valid' as const, message: '' };
  };

  const usernameValidation = validateUsername(formData.username);
  const emailValidation = validateEmail(formData.email);
  const confirmValidation = validateConfirmPassword(formData.confirmPassword);

  const parsedBalance = parseFloat(formData.initialBalance) || 0;
  const maxBalance = balance?.chipBalance ?? 0;
  const balanceExceeds = !isOwner && parsedBalance > maxBalance;

  const isFormValid =
    usernameValidation.state === 'valid' &&
    (emailValidation.state === 'valid' || emailValidation.state === 'neutral') &&
    passwordValid &&
    confirmValidation.state === 'valid' &&
    !balanceExceeds;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true, confirmPassword: true });
    if (!isFormValid) {
      toast({ variant: "destructive", title: "Error de validación", description: "Corrige los errores del formulario" });
      return;
    }
    setIsLoading(true);
    try {
      const payload: Record<string, unknown> = {
        username: formData.username.trim(),
        password: formData.password.trim(),
        role: 'CASHIER',
      };
      if (formData.email.trim()) payload.email = formData.email;
      if (formData.firstName.trim()) payload.firstName = formData.firstName;
      if (formData.lastName.trim()) payload.lastName = formData.lastName;
      if (parsedBalance > 0) payload.initialBalance = parsedBalance;

      const response = await apiService.post('/users', payload);
      if (response.success) {
        toast({ title: "Cajero creado", description: "El cajero fue creado exitosamente" });
        router.push('/admin/users');
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Error al crear cajero", description: response.error?.message || "Error desconocido" });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Error inesperado. Intente nuevamente." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Alta de Cajero">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Datos del Cajero
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de Usuario *</Label>
              <ValidatedInput
                value={formData.username}
                onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                onBlur={() => handleBlur('username')}
                placeholder="usuario123"
                validationState={touched.username ? usernameValidation.state : 'neutral'}
                errorMessage={usernameValidation.message}
              />
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
                placeholder="cajero@ejemplo.com"
                validationState={touched.email ? emailValidation.state : 'neutral'}
                errorMessage={emailValidation.message}
              />
            </div>

            <div className="space-y-2">
              <Label>Contraseña *</Label>
              <PasswordInput
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                onBlur={() => handleBlur('password')}
                placeholder="Contraseña segura"
                showRequirements
                onValidationChange={useCallback((v: boolean) => setPasswordValid(v), [])}
              />
            </div>

            <div className="space-y-2">
              <Label>Confirmar Contraseña *</Label>
              <PasswordInput
                value={formData.confirmPassword}
                onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                onBlur={() => handleBlur('confirmPassword')}
                placeholder="Repite la contraseña"
                showRequirements={false}
              />
              {touched.confirmPassword && confirmValidation.state === 'invalid' && (
                <p className="text-sm text-red-500">{confirmValidation.message}</p>
              )}
            </div>

            <div className="space-y-2">
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
                      const current = parseFloat(formData.initialBalance.replace(',', '.')) || 0;
                      setFormData(p => ({ ...p, initialBalance: String(current + preset) }));
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
                onChange={e => setFormData(p => ({ ...p, initialBalance: e.target.value }))}
                placeholder="0.00"
                className={balanceExceeds ? "border-red-500" : ""}
              />
              {balanceExceeds && (
                <p className="text-sm text-red-500">El saldo inicial no puede superar tu saldo disponible</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || !isFormValid}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Creando..." : "Crear Cajero"}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
