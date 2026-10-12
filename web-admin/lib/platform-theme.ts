import { backgroundGradientToCss, type CasinoThemeConfig, type CasinoThemeId } from 'helper';

const VALID_THEMES: CasinoThemeId[] = ['light', 'dark', 'casino', 'custom'];

// CSS variables currently applied inline on <html>. Inline styles have the
// highest precedence, so they override both :root and the light/dark class.
const appliedVars: string[] = [];

function setVar(root: HTMLElement, name: string, value: string): void {
  root.style.setProperty(name, value);
  appliedVars.push(name);
}

/** Removes any generated-theme variable previously applied to <html>. */
export function clearCustomThemeTokens(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const name of appliedVars) root.style.removeProperty(name);
  appliedVars.length = 0;
}

/** Applies the generated tokens on top of the requested light/dark base. */
export function applyCustomTheme(
  config: CasinoThemeConfig,
  setTheme: (theme: string) => void
): void {
  if (typeof document === 'undefined') return;
  clearCustomThemeTokens();
  setTheme(config.base);
  const root = document.documentElement;

  for (const [name, value] of Object.entries(config.tokens ?? {})) {
    if (value) setVar(root, '--' + name, value);
  }

  setVar(root, '--app-background-image', backgroundGradientToCss(config.backgroundGradient));

  const card = config.gameCard;
  if (card) {
    if (card.background) setVar(root, '--game-card-background', card.background);
    if (card.border) setVar(root, '--game-card-border', card.border);
    if (typeof card.radius === 'number') setVar(root, '--game-card-radius', card.radius + 'px');
    if (card.overlay) setVar(root, '--game-card-overlay', card.overlay);
  }
}

/**
 * Applies the platform theme coming from casino_settings: a generated theme
 * (theme === 'custom') layers its tokens over a light/dark base; any other value
 * is a preset whose class next-themes handles on its own.
 */
export function applyPlatformTheme(
  theme: CasinoThemeId | string | null | undefined,
  config: CasinoThemeConfig | null | undefined,
  setTheme: (theme: string) => void
): void {
  if (theme === 'custom' && config && config.base) {
    applyCustomTheme(config, setTheme);
    return;
  }
  clearCustomThemeTokens();
  if (theme && VALID_THEMES.includes(theme as CasinoThemeId)) setTheme(theme);
}
