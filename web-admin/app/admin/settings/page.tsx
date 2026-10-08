"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { useLanguage } from "@/contexts/language-context"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Globe, Palette, Bell, Save, RefreshCw, Loader2, Sun, Moon, Dices } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/services/api.service"
import { useAuth } from "@/contexts/auth-context"
import { markUserThemeOverride } from "@/lib/theme-sync"
import { UserRole } from "helper"

export default function AdminSettingsPage() {
  const { language, setLanguage, t } = useLanguage()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const { role } = useAuth()
  const isOwner = role === UserRole.OWNER
  const canChangeTheme = role === UserRole.OWNER || role === UserRole.ADMIN
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = async (newTheme: string) => {
    // The server theme is applied once by AdminThemeSync in providers.tsx. Tell it
    // not to overwrite this pick if its request is still in flight.
    markUserThemeOverride()
    const previous = theme ?? 'dark'
    setTheme(newTheme)
    try {
      const response = await apiService.patch('/settings/casino', { theme: newTheme })
      if (response.success) {
        toast({
          title: "Tema del casino actualizado",
          description: "El nuevo tema se aplicó a la plataforma y a los jugadores.",
        })
      } else {
        setTheme(previous)
        toast({
          title: "Error al guardar tema",
          description: response.error?.message || "No se pudo sincronizar el tema en el servidor",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      setTheme(previous)
      toast({
        title: "Error",
        description: err.message || "Error al actualizar tema",
        variant: "destructive",
      })
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await apiService.post<{ synced: number }>('/integrations/21viral/games/sync')
      if (response.success) {
        toast({ title: "Sincronización completa", description: `${response.data?.synced ?? 0} juegos sincronizados` })
      } else {
        toast({ title: "Error", description: response.error?.message || "No se pudo sincronizar", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  const handleSave = () => {
    console.log("Settings saved")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
          <p className="text-muted-foreground">Manage your platform preferences and configurations</p>
        </div>

        <div className="grid gap-6">
          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t("settings.language")}
              </CardTitle>
              <CardDescription>{t("settings.languageDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">{t("common.language")}</Label>
                <Select value={language} onValueChange={(value: "es" | "en") => setLanguage(value)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">{t("common.spanish")}</SelectItem>
                    <SelectItem value="en">{t("common.english")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings — only OWNER/ADMIN can change the platform theme */}
          {canChangeTheme && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t("settings.theme")}
              </CardTitle>
              <CardDescription>{t("settings.themeDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">{t("settings.theme")}</Label>
                {mounted ? (
                  <Select value={theme} onValueChange={handleThemeChange}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder={t("settings.theme")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4 text-amber-500" />
                          <span>{t("settings.themeLight")}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4 text-blue-400" />
                          <span>{t("settings.themeDark")}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="casino">
                        <div className="flex items-center gap-2">
                          <Dices className="h-4 w-4 text-emerald-400" />
                          <span>{t("settings.themeCasino")}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="w-[200px] h-9 border rounded-md bg-muted/20 animate-pulse" />
                )}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t("settings.notifications")}
              </CardTitle>
              <CardDescription>{t("settings.notificationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications about system events</p>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email updates about important events</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
            </CardContent>
          </Card>

          {/* Game Sync — Owner only */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Sincronización de Juegos
                </CardTitle>
                <CardDescription>Sincroniza el catálogo de juegos con el proveedor</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handleSync} disabled={syncing} className="gap-2">
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="w-[200px]">
              <Save className="mr-2 h-4 w-4" />
              {t("common.save")}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
