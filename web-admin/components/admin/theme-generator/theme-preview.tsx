"use client"
import type { CSSProperties } from 'react';
import {
  backgroundGradientToCss,
  type CasinoBackgroundGradient,
  type CasinoGameCardTokens,
  type GeneratedThemeTokens,
} from 'helper';

interface ThemePreviewProps {
  mode: 'light' | 'dark';
  tokens: GeneratedThemeTokens;
  gradient?: CasinoBackgroundGradient | null;
  gameCard?: CasinoGameCardTokens | null;
}

/**
 * Renders sample UI with the generated tokens applied inline on the wrapper, so
 * the preview reflects the theme (background gradient, cards, game cards) even
 * before it is saved to the server.
 */
export function ThemePreview({ mode, tokens, gradient, gameCard }: ThemePreviewProps) {
  const style: Record<string, string> = Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => ['--' + name, value])
  );
  if (gameCard?.background) style['--game-card-background'] = gameCard.background;
  if (gameCard?.border) style['--game-card-border'] = gameCard.border;
  if (gameCard?.radius != null) style['--game-card-radius'] = gameCard.radius + 'px';
  if (gameCard?.overlay) style['--game-card-overlay'] = gameCard.overlay;

  return (
    <div className={mode === 'dark' ? 'dark' : undefined} style={style as CSSProperties}>
      <div
        className="rounded-xl border p-4 text-foreground"
        style={{ backgroundColor: 'var(--background)', backgroundImage: backgroundGradientToCss(gradient) }}
      >
        <div className="flex gap-3">
          <aside className="hidden w-24 shrink-0 rounded-lg bg-sidebar p-3 text-sidebar-foreground sm:block">
            <p className="text-xs font-semibold">Sidebar</p>
            <div className="mt-2 h-6 rounded bg-sidebar-accent" />
            <div className="mt-1.5 h-6 rounded border border-sidebar-border" />
          </aside>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Vista previa</p>
                <p className="text-xs text-muted-foreground">Fondo, tarjetas y cards de juegos</p>
              </div>
              <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">Primario</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map(index => (
                <div
                  key={index}
                  className="overflow-hidden border"
                  style={{
                    borderRadius: 'var(--game-card-radius, 0.75rem)',
                    borderColor: 'var(--game-card-border, transparent)',
                  }}
                >
                  <div
                    className="relative aspect-square"
                    style={{ backgroundColor: 'var(--game-card-background, #18181b)' }}
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 h-6"
                      style={{ backgroundImage: 'linear-gradient(to top, var(--game-card-overlay, rgba(0,0,0,0.8)), transparent)' }}
                    />
                    <div className="absolute inset-x-0 bottom-1 flex justify-center">
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[8px] font-bold text-primary-foreground">Jugar</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border bg-card p-3 text-card-foreground">
              <p className="text-sm font-medium">Tarjeta</p>
              <p className="mt-1 text-xs text-muted-foreground">Texto secundario sobre la tarjeta</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">Aceptar</button>
                <button type="button" className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">Secundario</button>
                <button type="button" className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">Acento</button>
                <button type="button" className="rounded-md bg-destructive px-2.5 py-1 text-xs font-medium text-destructive-foreground">Peligro</button>
              </div>
            </div>

            <div className="flex gap-1.5">
              {[tokens['chart-1'], tokens['chart-2'], tokens['chart-3'], tokens['chart-4'], tokens['chart-5']].map((color, index) => (
                <span key={index} className="h-2 flex-1 rounded-full" style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
