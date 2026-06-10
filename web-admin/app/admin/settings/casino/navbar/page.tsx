"use client"
import { CasinoSettingsSubpage } from "@/components/admin/casino-settings/casino-settings-subpage"
import { BottomNavEditor } from "@/components/admin/casino-settings/bottom-nav-editor"

export default function NavbarSettingsPage() {
  return (
    <CasinoSettingsSubpage
      title="Navbar mobile"
      description="Orden y visibilidad de la barra inferior que ven los jugadores en el celular."
    >
      {({ settings, saving, handleSave }) => (
        <BottomNavEditor
          items={settings.bottomNavItems ?? []}
          headerCategories={settings.headerCategories}
          saving={saving}
          onSave={items => handleSave({ bottomNavItems: items })}
        />
      )}
    </CasinoSettingsSubpage>
  )
}
