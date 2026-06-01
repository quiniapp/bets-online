import { CasinoSettings, UpdateCasinoSettingsDto, UserRole, ErrorCode } from 'helper';
import { casinoSettingsRepository } from '../../persistence/repositories/casino-settings.repository';
import { usersRepository } from '../../persistence/repositories/users.repository';
import { AppError } from '../../middleware/error.middleware';

export class SettingsDomain {
  async getCasinoSettings(requesterId: string): Promise<CasinoSettings> {
    const requester = await usersRepository.findById(requesterId);
    if (!requester) throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');

    const ownerId = await this.resolveOwnerId(requesterId, requester.role);
    return casinoSettingsRepository.findByOwnerId(ownerId);
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
    if (patch.lobbySlots && patch.lobbySlots.length > 10) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Lobby slots cannot exceed 10');
    }
    return casinoSettingsRepository.patch(requesterId, patch);
  }

  private async resolveOwnerId(userId: string, role: string): Promise<string> {
    if (role === UserRole.OWNER) return userId;
    const user = await usersRepository.findById(userId);
    if (!user?.parentUserId) return userId;
    const parent = await usersRepository.findById(user.parentUserId);
    if (!parent) return userId;
    return this.resolveOwnerId(parent.id, parent.role);
  }
}

export const settingsDomain = new SettingsDomain();
