"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/contexts/auth-context"
import { UserRole } from "helper"
import { useCasinoSettings } from "@/hooks/useCasinoSettings"
import { HeaderCategoriesEditor } from "@/components/admin/casino-settings/header-categories-editor"
import { LobbySlotEditor } from "@/components/admin/casino-settings/lobby-slots-editor"
import { FooterLinksEditor } from "@/components/admin/casino-settings/footer-links-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import type { UpdateCasinoSettingsDto } from "helper"

export default function CasinoSettingsPage() {
  const { role } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { settings, loading, saving, save } = useCasinoSettings()

  useEffect(() => {
    if (role && role !== UserRole.OWNER) {
      router.replace('/admin/dashboard')
    }
  }, [role, router])

  if (loading || !settings) {
    return (
      <DashboardLayout title="Configuración de Casino">
        <div className="text-center py-8 text-muted-foreground">Cargando configuración...</div>
      </DashboardLayout>
    )
  }

  const handleSave = async (patch: UpdateCasinoSettingsDto) => {
    const ok = await save(patch)
    toast(ok
      ? { title: "Guardado", description: "Configuración actualizada correctamente" }
      : { title: "Error", description: "No se pudo guardar", variant: "destructive" }
    )
  }

  return (
    <DashboardLayout title="Configuración de Casino">
      <Tabs defaultValue="header" className="space-y-6">
        <TabsList>
          <TabsTrigger value="header">Header</TabsTrigger>
          <TabsTrigger value="lobby">Lobby</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>

        <TabsContent value="header" className="space-y-4">
          <h2 className="text-lg font-semibold">Categorías del Header</h2>
          <p className="text-sm text-muted-foreground">
            Orden en que aparecen las categorías en la barra superior del casino.
          </p>
          <HeaderCategoriesEditor
            categories={settings.headerCategories}
            saving={saving}
            onSave={cats => handleSave({ headerCategories: cats })}
          />
        </TabsContent>

        <TabsContent value="lobby" className="space-y-4">
          <h2 className="text-lg font-semibold">Slots del Lobby</h2>
          <p className="text-sm text-muted-foreground">
            Secciones visibles en el lobby. Máximo 10.
          </p>
          <LobbySlotEditor
            slots={settings.lobbySlots}
            saving={saving}
            onSave={slots => handleSave({ lobbySlots: slots })}
          />
        </TabsContent>

        <TabsContent value="footer" className="space-y-4">
          <h2 className="text-lg font-semibold">Enlaces del Footer</h2>
          <p className="text-sm text-muted-foreground">
            Links que aparecen en el pie de página del casino.
          </p>
          <FooterLinksEditor
            links={settings.footerLinks}
            saving={saving}
            onSave={links => handleSave({ footerLinks: links })}
          />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  )
}
