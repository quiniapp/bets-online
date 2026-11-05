import { THEME_TOKEN_NAMES, type ThemeTokenName } from '../constants';
import type { CasinoBackgroundGradient } from '../types/models.types';

export interface ThemeGeneratorSeeds {
  mode: 'light' | 'dark';
  primary: string;
  background?: string;
  accent?: string;
  destructive?: string;
  foreground?: string;
}

export type GeneratedThemeTokens = Record<ThemeTokenName, string>;

export const DEFAULT_THEME_PRIMARY = '#7c5cff';

interface Rgb { r: number; g: number; b: number }
interface Hsl { h: number; s: number; l: number }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  let hex = input.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    hex = '#' + hex.slice(1).split('').map(char => char + char).join('');
  }
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : fallback;
}

function hexToRgb(hex: string): Rgb {
  const value = normalizeHex(hex, '#000000').slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(rgb: Rgb): string {
  const toHex = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  return '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
}

function rgbToHsl(rgb: Rgb): Hsl {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;
  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) h = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb(hsl: Hsl): Rgb {
  const s = clamp(hsl.s, 0, 100) / 100;
  const l = clamp(hsl.l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((hsl.h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = l - c / 2;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function hsl(h: number, s: number, l: number): string {
  return rgbToHex(hslToRgb({ h, s, l }));
}

/** WCAG relative-luminance contrast ratio between two hex colors. */
export function getContrastRatio(a: string, b: string): number {
  const luminance = (hex: string): number => {
    const rgb = hexToRgb(hex);
    const channel = (v: number) => {
      const n = v / 255;
      return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  };
  const l1 = luminance(a);
  const l2 = luminance(b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

/** Returns near-white or near-black, whichever reads better on the given background. */
export function readableForeground(background: string): string {
  const bg = normalizeHex(background, '#000000');
  const dark = '#0a0a0a';
  const light = '#fafafa';
  return getContrastRatio(bg, dark) >= getContrastRatio(bg, light) ? dark : light;
}

export function isThemeTokenName(value: string): value is ThemeTokenName {
  return (THEME_TOKEN_NAMES as readonly string[]).includes(value);
}

/**
 * Converts a stored background gradient into a CSS background-image value.
 * Returns 'none' when there is no usable gradient, so callers can always assign
 * the result to a --app-background-image variable.
 */
export function backgroundGradientToCss(
  gradient: CasinoBackgroundGradient | null | undefined
): string {
  if (!gradient || !gradient.from || !gradient.to) return 'none';
  const angle = Number.isFinite(gradient.angle) ? gradient.angle : 180;
  const stops = [gradient.from, gradient.via, gradient.to].filter(Boolean).join(', ');
  return 'linear-gradient(' + angle + 'deg, ' + stops + ')';
}

/**
 * Builds a full light/dark token set from a handful of seed colors. Neutral
 * surfaces are tinted with the brand hue so the result feels cohesive without
 * asking the admin to pick every token.
 */
export function generateThemeTokens(seeds: ThemeGeneratorSeeds): GeneratedThemeTokens {
  const primary = normalizeHex(seeds.primary, DEFAULT_THEME_PRIMARY);
  const baseHsl = rgbToHsl(hexToRgb(primary));
  const h = baseHsl.h;
  const saturation = clamp(baseHsl.s, 8, 92);
  const neutralSaturation = clamp(saturation * 0.25, 5, 22);
  const destructive = normalizeHex(seeds.destructive, hsl(0, 72, 55));

  if (seeds.mode === 'light') {
    const background = normalizeHex(seeds.background, hsl(h, clamp(saturation * 0.5, 8, 40), 98));
    const foreground = normalizeHex(seeds.foreground, hsl(h, clamp(saturation * 0.4, 6, 25), 12));
    const accent = normalizeHex(seeds.accent, hsl(h, clamp(saturation * 0.5, 12, 45), 92));
    return {
      'background': background,
      'foreground': foreground,
      'card': '#ffffff',
      'card-foreground': foreground,
      'popover': '#ffffff',
      'popover-foreground': foreground,
      'primary': primary,
      'primary-foreground': readableForeground(primary),
      'secondary': hsl(h, clamp(saturation * 0.35, 6, 30), 94),
      'secondary-foreground': hsl(h, clamp(saturation * 0.4, 6, 25), 20),
      'muted': hsl(h, clamp(saturation * 0.35, 6, 30), 95),
      'muted-foreground': hsl(h, clamp(saturation * 0.3, 5, 20), 45),
      'accent': accent,
      'accent-foreground': hsl(h, clamp(saturation * 0.4, 6, 25), 18),
      'destructive': destructive,
      'destructive-foreground': readableForeground(destructive),
      'border': hsl(h, clamp(saturation * 0.3, 6, 22), 88),
      'input': hsl(h, clamp(saturation * 0.3, 6, 22), 88),
      'ring': primary,
      'chart-1': primary,
      'chart-2': hsl((h + 45) % 360, clamp(saturation, 30, 85), 55),
      'chart-3': hsl((h + 150) % 360, clamp(saturation, 30, 85), 50),
      'chart-4': hsl((h + 210) % 360, clamp(saturation, 30, 85), 60),
      'chart-5': hsl((h + 300) % 360, clamp(saturation, 30, 85), 48),
      'sidebar': hsl(h, clamp(saturation * 0.4, 8, 35), 96),
      'sidebar-foreground': hsl(h, clamp(saturation * 0.4, 6, 25), 16),
      'sidebar-primary': primary,
      'sidebar-primary-foreground': readableForeground(primary),
      'sidebar-accent': hsl(h, clamp(saturation * 0.4, 8, 35), 92),
      'sidebar-accent-foreground': hsl(h, clamp(saturation * 0.4, 6, 25), 20),
      'sidebar-border': hsl(h, clamp(saturation * 0.3, 6, 22), 90),
      'sidebar-ring': primary,
    };
  }

  const background = normalizeHex(seeds.background, hsl(h, neutralSaturation, 8));
  const foreground = normalizeHex(seeds.foreground, hsl(h, clamp(neutralSaturation, 5, 12), 96));
  const accent = normalizeHex(seeds.accent, hsl(h, clamp(neutralSaturation * 1.6, 12, 32), 20));
  return {
    'background': background,
    'foreground': foreground,
    'card': hsl(h, neutralSaturation, 11),
    'card-foreground': foreground,
    'popover': hsl(h, neutralSaturation, 11),
    'popover-foreground': foreground,
    'primary': primary,
    'primary-foreground': readableForeground(primary),
    'secondary': hsl(h, neutralSaturation, 16),
    'secondary-foreground': hsl(h, clamp(neutralSaturation, 5, 12), 95),
    'muted': hsl(h, neutralSaturation, 16),
    'muted-foreground': hsl(h, clamp(neutralSaturation, 5, 10), 64),
    'accent': accent,
    'accent-foreground': hsl(h, clamp(neutralSaturation, 5, 12), 97),
    'destructive': destructive,
    'destructive-foreground': readableForeground(destructive),
    'border': hsl(h, neutralSaturation, 22),
    'input': hsl(h, neutralSaturation, 16),
    'ring': primary,
    'chart-1': primary,
    'chart-2': hsl((h + 45) % 360, clamp(saturation, 30, 85), 62),
    'chart-3': hsl((h + 150) % 360, clamp(saturation, 30, 85), 58),
    'chart-4': hsl((h + 210) % 360, clamp(saturation, 30, 85), 66),
    'chart-5': hsl((h + 300) % 360, clamp(saturation, 30, 85), 60),
    'sidebar': hsl(h, clamp(neutralSaturation * 0.9, 5, 20), 6),
    'sidebar-foreground': foreground,
    'sidebar-primary': primary,
    'sidebar-primary-foreground': readableForeground(primary),
    'sidebar-accent': hsl(h, neutralSaturation, 15),
    'sidebar-accent-foreground': foreground,
    'sidebar-border': hsl(h, neutralSaturation, 18),
    'sidebar-ring': primary,
  };
}
