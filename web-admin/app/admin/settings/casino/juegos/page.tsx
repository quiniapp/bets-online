"use client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SettingsPageShell } from "@/components/admin/casino-settings/settings-page-shell"
import { ProviderOrderingEditor } from "@/components/admin/casino-settings/provider-ordering-editor"
import { useOwnerGuard } from "@/hooks/useOwnerGuard"

export default function JuegosSettingsPage() {
  useOwnerGuard()

  return (
    <DashboardLayout title="Personalización del Casino">
      <SettingsPageShell
        title="Orden de Juegos"
        description="Por proveedor: ordená los tipos de juego en bloque y, dentro de cada tipo, los juegos uno por uno."
      >
        <ProviderOrderingEditor />
      </SettingsPageShell>
    </DashboardLayout>
  )
}
