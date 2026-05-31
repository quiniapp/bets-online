import { UserRole } from 'helper'

export type SiteType = 'player' | 'panel'

export function getSiteType(): SiteType {
  return 'player'
}

const PANEL_ROLES = new Set<UserRole>([UserRole.OWNER, UserRole.ADMIN, UserRole.CASHIER])

export function isRoleAllowedForSite(role: UserRole, siteType: SiteType): boolean {
  return siteType === 'player' ? role === UserRole.PLAYER : PANEL_ROLES.has(role)
}

export const SITE_ACCESS_ERROR: Record<SiteType, string> = {
  player: 'Esta plataforma es exclusiva para jugadores.',
  panel: 'Esta plataforma es exclusiva para administradores, cajeros y propietarios.',
}
