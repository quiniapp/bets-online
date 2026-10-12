import { z } from 'zod';
import { MAX_BOTTOM_NAV_VISIBLE, MAX_LOBBY_SLOTS, THEME_TOKEN_NAMES } from '../constants';

const cssColorSchema = z
  .string()
  .min(1)
  .max(64)
  .refine(
    value => /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|oklch\(|oklab\(|color\()/.test(value),
    { message: 'Invalid CSS color' }
  );

/**
 * Body of the generated ("custom") theme. base decides which preset the token
 * overrides are layered on; tokens is a partial map of CSS variable suffix to
 * color value.
 */
const backgroundGradientSchema = z.object({
  angle: z.number().min(0).max(360),
  from: cssColorSchema,
  to: cssColorSchema,
  via: cssColorSchema.optional(),
});

const gameCardSchema = z.object({
  background: cssColorSchema.optional(),
  border: cssColorSchema.optional(),
  radius: z.number().min(0).max(64).optional(),
  overlay: cssColorSchema.optional(),
});

const themeConfigSchema = z.object({
  base: z.enum(['light', 'dark']),
  tokens: z
    .object(
      Object.fromEntries(
        THEME_TOKEN_NAMES.map(token => [token, cssColorSchema.optional()])
      )
    )
    .optional(),
  backgroundGradient: backgroundGradientSchema.nullable().optional(),
  gameCard: gameCardSchema.nullable().optional(),
});

const savedCustomThemeSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(60),
  config: themeConfigSchema,
});

const lobbySlotSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.enum(['category', 'provider', 'both']),
  categoryType: z.string().min(1).max(50).optional(),
  providerName: z.string().min(1).max(100).optional(),
  label: z.string().min(1).max(100),
});

const footerLinkSchema = z.object({
  id: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  href: z.string().min(1).max(500),
  visible: z.boolean(),
});

const bottomNavItemSchema = z.object({
  categoryType: z.string().min(1).max(50),
  visible: z.boolean(),
});

/**
 * PATCH /settings/casino body. Every field optional; shapes stay permissive
 * enough for the current admin payloads.
 */
export const updateCasinoSettingsSchema = z.object({
  headerCategories: z.array(z.string().min(1).max(50)).max(20).optional(),
  lobbySlots: z.array(lobbySlotSchema).max(MAX_LOBBY_SLOTS).optional(),
  footerLinks: z.array(footerLinkSchema).max(30).optional(),
  theme: z.enum(['light', 'dark', 'casino', 'custom']).optional(),
  themeConfig: themeConfigSchema.optional(),
  savedThemes: z.array(savedCustomThemeSchema).max(30).optional(),
  activeThemeId: z.string().min(1).max(64).nullable().optional(),
  bottomNavItems: z
    .array(bottomNavItemSchema)
    .max(20)
    .refine(
      items => items.filter(i => i.visible).length <= MAX_BOTTOM_NAV_VISIBLE,
      { message: `At most ${MAX_BOTTOM_NAV_VISIBLE} visible bottom nav items` }
    )
    .refine(
      items => new Set(items.map(i => i.categoryType)).size === items.length,
      { message: 'Duplicate categoryType in bottomNavItems' }
    )
    .optional(),
});
