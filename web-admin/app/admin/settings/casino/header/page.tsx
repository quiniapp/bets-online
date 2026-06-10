"use client"
import { CasinoSettingsSubpage } from "@/components/admin/casino-settings/casino-settings-subpage"
import { HeaderCategoriesEditor } from "@/components/admin/casino-settings/header-categories-editor"

export default function HeaderSettingsPage() {
  return (
    <CasinoSettingsSubpage
      title="Categorías del Header"
      description="Orden en que aparecen las categorías en la barra superior del casino."
    >
      {({ settings, saving, handleSave }) => (
        <HeaderCategoriesEditor
          categories={settings.headerCategories}
          saving={saving}
          onSave={cats => handleSave({ headerCategories: cats })}
        />
      )}
    </CasinoSettingsSubpage>
  )
}
