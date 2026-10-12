"use client"
import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_THEME_PRIMARY,
  generateThemeTokens,
  type CasinoBackgroundGradient,
  type CasinoGameCardTokens,
  type CasinoSettings,
  type CasinoThemeConfig,
  type GeneratedThemeTokens,
  type SavedCustomTheme,
} from 'helper';
import {
  Dices,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Moon,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Sun,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api.service';
import { ColorField } from './color-field';
import { ThemePreview } from './theme-preview';

function randomHex(): string {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

function newThemeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'theme-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/**
 * Theme builder. It only saves themes to the owner library; applying them (and
 * the base presets) is the job of the header ThemeToggle.
 */
export function ThemeGenerator() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedThemes, setSavedThemes] = useState<SavedCustomTheme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('Mi tema');
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const [primary, setPrimary] = useState(DEFAULT_THEME_PRIMARY);
  const [background, setBackground] = useState('');
  const [accent, setAccent] = useState('');
  const [destructive, setDestructive] = useState('');
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [gradientFrom, setGradientFrom] = useState('');
  const [gradientVia, setGradientVia] = useState('');
  const [gradientTo, setGradientTo] = useState('');
  const [gradientAngle, setGradientAngle] = useState(180);
  const [cardBackground, setCardBackground] = useState('');
  const [cardBorder, setCardBorder] = useState('');
  const [cardRadius, setCardRadius] = useState('');
  const [cardOverlay, setCardOverlay] = useState('');

  const tokens = useMemo<GeneratedThemeTokens>(
    () =>
      generateThemeTokens({
        mode,
        primary,
        background: background || undefined,
        accent: accent || undefined,
        destructive: destructive || undefined,
      }),
    [mode, primary, background, accent, destructive]
  );

  const gradient = useMemo<CasinoBackgroundGradient | null>(() => {
    if (!gradientEnabled || !gradientFrom || !gradientTo) return null;
    return { angle: gradientAngle, from: gradientFrom, to: gradientTo, via: gradientVia || undefined };
  }, [gradientEnabled, gradientFrom, gradientTo, gradientVia, gradientAngle]);

  const gameCard = useMemo<CasinoGameCardTokens>(() => {
    const radius = Number(cardRadius);
    return {
      background: cardBackground || undefined,
      border: cardBorder || undefined,
      radius: cardRadius.trim() !== '' && Number.isFinite(radius) ? radius : undefined,
      overlay: cardOverlay || undefined,
    };
  }, [cardBackground, cardBorder, cardRadius, cardOverlay]);

  const loadConfigIntoForm = (config: CasinoThemeConfig) => {
    setMode(config.base);
    const t = config.tokens ?? {};
    setPrimary(t.primary ?? DEFAULT_THEME_PRIMARY);
    setBackground(t.background ?? '');
    setAccent(t.accent ?? '');
    setDestructive(t.destructive ?? '');
    const g = config.backgroundGradient;
    setGradientEnabled(!!g);
    setGradientFrom(g?.from ?? '');
    setGradientVia(g?.via ?? '');
    setGradientTo(g?.to ?? '');
    setGradientAngle(g?.angle ?? 180);
    const c = config.gameCard;
    setCardBackground(c?.background ?? '');
    setCardBorder(c?.border ?? '');
    setCardRadius(c?.radius != null ? String(c.radius) : '');
    setCardOverlay(c?.overlay ?? '');
  };

  const resetForm = () => {
    setMode('dark');
    setPrimary(DEFAULT_THEME_PRIMARY);
    setBackground('');
    setAccent('');
    setDestructive('');
    setGradientEnabled(false);
    setGradientFrom('');
    setGradientVia('');
    setGradientTo('');
    setGradientAngle(180);
    setCardBackground('');
    setCardBorder('');
    setCardRadius('');
    setCardOverlay('');
  };

  useEffect(() => {
    let active = true;
    apiService
      .get<CasinoSettings>('/settings/casino')
      .then(res => {
        if (!active || !res.success || !res.data) return;
        const settings = res.data;
        setSavedThemes(settings.savedThemes ?? []);
        setActiveThemeId(settings.activeThemeId ?? null);
        if (settings.themeConfig) loadConfigIntoForm(settings.themeConfig);
      })
      .catch(() => {/* keep the defaults */})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = async (
    next: SavedCustomTheme[],
    extra: Record<string, unknown>,
    okMessage: string
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await apiService.patch<CasinoSettings>('/settings/casino', {
        savedThemes: next,
        ...extra,
      });
      if (!res.success) {
        toast({
          title: 'No se pudo guardar',
          description: res.error?.message || 'El servidor rechazó el cambio',
          variant: 'destructive',
        });
        return false;
      }
      setSavedThemes(res.data?.savedThemes ?? next);
      if (res.data) setActiveThemeId(res.data.activeThemeId ?? null);
      toast({ title: okMessage });
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Error de red', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveTheme = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: 'Poné un nombre para el tema', variant: 'destructive' });
      return;
    }
    const config: CasinoThemeConfig = { base: mode, tokens, backgroundGradient: gradient, gameCard };
    const next = editingId
      ? savedThemes.map(theme => (theme.id === editingId ? { ...theme, name: trimmed, config } : theme))
      : [...savedThemes, { id: newThemeId(), name: trimmed, config }];
    const ok = await persist(next, {}, editingId ? 'Tema actualizado' : 'Tema guardado');
    if (ok) setEditingId(null);
  };

  const deleteTheme = async (id: string) => {
    const next = savedThemes.filter(theme => theme.id !== id);
    const extra = activeThemeId === id ? { activeThemeId: null } : {};
    await persist(next, extra, 'Tema eliminado');
    if (editingId === id) {
      setEditingId(null);
      resetForm();
    }
  };

  const editTheme = (saved: SavedCustomTheme) => {
    setEditingId(saved.id);
    setName(saved.name);
    loadConfigIntoForm(saved.config);
  };

  const newTheme = () => {
    setEditingId(null);
    setName('Mi tema');
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando temas...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Armá un tema y guardalo. Los temas se aplican desde el selector de la barra superior
        (arriba a la derecha), junto con los temas base. Guardar no cambia el tema activo.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" />
              {editingId ? 'Editar tema' : 'Nuevo tema'}
            </CardTitle>
            <CardDescription>Ajustá los colores base y mirá el resultado en vivo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm" htmlFor="theme-name">Nombre</label>
              <Input
                id="theme-name"
                value={name}
                maxLength={60}
                placeholder="Mi tema"
                onChange={event => setName(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={mode === 'light' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setMode('light')}
              >
                <Sun className="h-4 w-4" /> Claro
              </Button>
              <Button
                variant={mode === 'dark' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setMode('dark')}
              >
                <Moon className="h-4 w-4" /> Oscuro
              </Button>
            </div>
            <ColorField label="Color de marca" value={primary} onChange={setPrimary} />
            <ColorField label="Fondo" value={background || tokens['background']} onChange={setBackground} />
            <ColorField label="Acento" value={accent || tokens['accent']} onChange={setAccent} />
            <ColorField label="Peligro" value={destructive || tokens['destructive']} onChange={setDestructive} />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setPrimary(randomHex())}>
                <Dices className="h-4 w-4" /> Color al azar
              </Button>
              <Button variant="ghost" size="sm" className="gap-2" onClick={newTheme}>
                <RefreshCw className="h-4 w-4" /> Nuevo
              </Button>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 gap-2" disabled={saving} onClick={saveTheme}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Guardar cambios' : 'Guardar tema'}
              </Button>
              {editingId && (
                <Button variant="outline" size="icon" onClick={newTheme} title="Nuevo tema" disabled={saving}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista previa</CardTitle>
            <CardDescription>Así se verá el tema cuando lo apliques desde el selector.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemePreview mode={mode} tokens={tokens} gradient={gradient} gameCard={gameCard} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="h-4 w-4" />
            Degradado y cards de juegos
          </CardTitle>
          <CardDescription>Personalizá el fondo y las cards del lobby de jugadores.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="h-4 w-4" />
              Fondo con degradado
            </span>
            <Switch
              checked={gradientEnabled}
              onCheckedChange={checked => {
                if (checked) {
                  if (!gradientFrom) setGradientFrom(tokens['background']);
                  if (!gradientTo) setGradientTo(tokens['card']);
                }
                setGradientEnabled(checked);
              }}
            />
          </div>
          {gradientEnabled && (
            <div className="space-y-3">
              <ColorField label="Desde" value={gradientFrom || tokens['background']} onChange={setGradientFrom} />
              <ColorField label="Hasta" value={gradientTo || tokens['card']} onChange={setGradientTo} />
              <ColorField label="Intermedio (opcional)" value={gradientVia || '#000000'} onChange={setGradientVia} />
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Ángulo</span>
                  <span className="text-muted-foreground">{gradientAngle}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={gradientAngle}
                  onChange={event => setGradientAngle(Number(event.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Cards de juegos</p>
            <ColorField label="Fondo de la card" value={cardBackground || tokens['card']} onChange={setCardBackground} />
            <ColorField label="Borde" value={cardBorder || tokens['border']} onChange={setCardBorder} />
            <ColorField label="Sombra inferior" value={cardOverlay || '#000000'} onChange={setCardOverlay} />
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
              <span className="text-sm">Redondeo (px)</span>
              <Input
                type="number"
                min={0}
                max={64}
                value={cardRadius}
                placeholder="12"
                onChange={event => setCardRadius(event.target.value)}
                className="h-7 w-20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Temas guardados</CardTitle>
          <CardDescription>Se aplican desde el selector de temas de la barra superior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {savedThemes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no guardaste ningún tema.</p>
          ) : (
            savedThemes.map(saved => (
              <div key={saved.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                <Palette className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{saved.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {saved.config.base === 'light' ? 'Claro' : 'Oscuro'}
                    {saved.config.backgroundGradient ? ' · con degradado' : ''}
                  </p>
                </div>
                {activeThemeId === saved.id && <Badge variant="secondary">Activo</Badge>}
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => editTheme(saved)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  title="Eliminar"
                  disabled={saving}
                  onClick={() => deleteTheme(saved.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
