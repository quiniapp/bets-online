"use client"
import { DashboardLayout } from '@/components/dashboard-layout';
import { SettingsPageShell } from './settings-page-shell';
import { useOwnerGuard } from '@/hooks/useOwnerGuard';
import { useCasinoSettings } from '@/hooks/useCasinoSettings';
import { useToast } from '@/hooks/use-toast';
import type { CasinoSettings, UpdateCasinoSettingsDto } from 'helper';

interface SubpageContext {
  settings: CasinoSettings;
  saving: boolean;
  handleSave: (patch: UpdateCasinoSettingsDto) => Promise<void>;
}

interface CasinoSettingsSubpageProps {
  title: string;
  description: string;
  children: (ctx: SubpageContext) => React.ReactNode;
}

/**
 * Shared chrome + data plumbing for the settings/casino subpages that edit
 * CasinoSettings: OWNER guard, layout, back link, load state and save/toast.
 */
export function CasinoSettingsSubpage({ title, description, children }: CasinoSettingsSubpageProps) {
  useOwnerGuard();
  const { toast } = useToast();
  const { settings, loading, saving, save } = useCasinoSettings();

  const handleSave = async (patch: UpdateCasinoSettingsDto) => {
    const ok = await save(patch);
    toast(ok
      ? { title: 'Guardado', description: 'Configuración actualizada correctamente' }
      : { title: 'Error', description: 'No se pudo guardar', variant: 'destructive' }
    );
  };

  return (
    <DashboardLayout title="Personalización del Casino">
      <SettingsPageShell title={title} description={description}>
        {loading || !settings ? (
          <div className="text-center py-8 text-muted-foreground">Cargando configuración...</div>
        ) : (
          children({ settings, saving, handleSave })
        )}
      </SettingsPageShell>
    </DashboardLayout>
  );
}
