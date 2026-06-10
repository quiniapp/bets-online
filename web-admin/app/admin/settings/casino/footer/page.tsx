"use client"
import { CasinoSettingsSubpage } from "@/components/admin/casino-settings/casino-settings-subpage"
import { FooterLinksEditor } from "@/components/admin/casino-settings/footer-links-editor"

export default function FooterSettingsPage() {
  return (
    <CasinoSettingsSubpage
      title="Enlaces del Footer"
      description="Links que aparecen en el pie de página del casino."
    >
      {({ settings, saving, handleSave }) => (
        <FooterLinksEditor
          links={settings.footerLinks}
          saving={saving}
          onSave={links => handleSave({ footerLinks: links })}
        />
      )}
    </CasinoSettingsSubpage>
  )
}
