"use client"
import { CasinoSettingsSubpage } from "@/components/admin/casino-settings/casino-settings-subpage"
import { LobbySlotEditor } from "@/components/admin/casino-settings/lobby-slots-editor"

export default function LobbySettingsPage() {
  return (
    <CasinoSettingsSubpage
      title="Slots del Lobby"
      description="Secciones visibles en el lobby. Máximo 10."
    >
      {({ settings, saving, handleSave }) => (
        <LobbySlotEditor
          slots={settings.lobbySlots}
          saving={saving}
          onSave={slots => handleSave({ lobbySlots: slots })}
        />
      )}
    </CasinoSettingsSubpage>
  )
}
