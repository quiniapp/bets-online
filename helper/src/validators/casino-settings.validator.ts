import { z } from 'zod';
import { MAX_BOTTOM_NAV_VISIBLE, MAX_LOBBY_SLOTS } from '../constants';

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
