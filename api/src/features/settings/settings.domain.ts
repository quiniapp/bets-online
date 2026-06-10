import { CasinoSettings, UpdateCasinoSettingsDto, UserRole, ErrorCode, MAX_LOBBY_SLOTS } from 'helper';
import { casinoSettingsRepository } from './casino-settings.repository';
import { usersRepository } from '../users/users.repository';
import { AppError } from '../../middleware/error.middleware';
import { casinoSettingsMemCache } from '../../utils/games-cache';
import { warmLobbySections } from '../../utils/cache-warmup';

export class SettingsDomain {
  async getCasinoSettings(requesterId?: string): Promise<CasinoSettings> {
    // Cached by requester ('anon' for the public home call). Caches the whole
    // owner-chain resolution + DB read; cleared on updateCasinoSettings.
    return casinoSettingsMemCache.getOrFetch(requesterId ?? 'anon', async () => {
      if (!requesterId) {
        // Anonymous request — find the system owner
        const owner = await usersRepository.findOwner();
        if (!owner) {
          return casinoSettingsRepository.findByOwnerId('');
        }
        return casinoSettingsRepository.findByOwnerId(owner.id);
      }

      const requester = await usersRepository.findById(requesterId);
      if (!requester) throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');

      const ownerId = await this.resolveOwnerId(requesterId, requester.role);
      return casinoSettingsRepository.findByOwnerId(ownerId);
    });
  }

  async updateCasinoSettings(
    requesterId: string,
    patch: UpdateCasinoSettingsDto
  ): Promise<CasinoSettings> {
    const requester = await usersRepository.findById(requesterId);
    if (!requester) throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    if (requester.role !== UserRole.OWNER) {
      throw new AppError(403, ErrorCode.INSUFFICIENT_PERMISSIONS, 'Only owners can update casino settings');
    }
    if (patch.lobbySlots && patch.lobbySlots.length > MAX_LOBBY_SLOTS) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, `Lobby slots cannot exceed ${MAX_LOBBY_SLOTS}`);
    }
    const updated = await casinoSettingsRepository.patch(requesterId, patch);
    casinoSettingsMemCache.invalidate();
    if (patch.lobbySlots) {
      // The home renders one games section per lobby slot — warm the new
      // combos right away so the first visitor is served from cache.
      warmLobbySections().catch(() => { /* warmup failure must not fail the PATCH */ });
    }
    return updated;
  }

  private async resolveOwnerId(userId: string, role: string, visited = new Set<string>()): Promise<string> {
    if (role === UserRole.OWNER) return userId;
    if (visited.has(userId)) {
      throw new AppError(500, ErrorCode.INTERNAL_ERROR, 'Circular parent chain detected');
    }
    visited.add(userId);
    const user = await usersRepository.findById(userId);
    if (!user?.parentUserId) {
      throw new AppError(500, ErrorCode.INTERNAL_ERROR, 'Parent chain is broken: no OWNER found');
    }
    const parent = await usersRepository.findById(user.parentUserId);
    if (!parent) {
      throw new AppError(500, ErrorCode.INTERNAL_ERROR, 'Parent chain is broken: referenced parent does not exist');
    }
    return this.resolveOwnerId(parent.id, parent.role, visited);
  }
}

export const settingsDomain = new SettingsDomain();
