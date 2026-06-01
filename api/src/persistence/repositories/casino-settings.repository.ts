import { CasinoSettingsModel } from '../models/casino-settings.model';
import type { CasinoSettings, UpdateCasinoSettingsDto, LobbySlot, FooterLink } from 'helper';

const DEFAULT_HEADER_CATEGORIES = [
  'videoSlots', 'LiveGames', 'CrashGame', 'Roulette', 'Blackjack',
];

const DEFAULT_LOBBY_SLOTS: LobbySlot[] = [
  { id: '1', kind: 'category', categoryType: 'videoSlots', label: 'Casino' },
  { id: '2', kind: 'category', categoryType: 'LiveGames', label: 'Casino en Vivo' },
  { id: '3', kind: 'category', categoryType: 'CrashGame', label: 'Crash' },
  { id: '4', kind: 'category', categoryType: 'Roulette', label: 'Ruletas' },
  { id: '5', kind: 'category', categoryType: 'Blackjack', label: 'Blackjack' },
];

const DEFAULT_FOOTER_LINKS: FooterLink[] = [
  { id: '1', label: 'Términos y Condiciones', href: '/terminos', visible: true },
  { id: '2', label: 'Política de Privacidad', href: '/privacidad', visible: true },
  { id: '3', label: 'Contacto', href: '/contacto', visible: true },
];

function mapToSettings(model: CasinoSettingsModel): CasinoSettings {
  return {
    id: model.id,
    ownerId: model.ownerId,
    headerCategories: model.headerCategories,
    lobbySlots: model.lobbySlots,
    footerLinks: model.footerLinks,
    updatedAt: model.updatedAt,
  };
}

export class CasinoSettingsRepository {
  async findByOwnerId(ownerId: string): Promise<CasinoSettings> {
    const record = await CasinoSettingsModel.findOne({ where: { ownerId } });
    if (!record) {
      return {
        id: '',
        ownerId,
        headerCategories: DEFAULT_HEADER_CATEGORIES,
        lobbySlots: DEFAULT_LOBBY_SLOTS,
        footerLinks: DEFAULT_FOOTER_LINKS,
        updatedAt: new Date(),
      };
    }
    return mapToSettings(record);
  }

  async patch(ownerId: string, patch: UpdateCasinoSettingsDto): Promise<CasinoSettings> {
    const current = await this.findByOwnerId(ownerId);
    const [record] = await CasinoSettingsModel.upsert({
      ownerId,
      headerCategories: patch.headerCategories ?? current.headerCategories,
      lobbySlots: patch.lobbySlots ?? current.lobbySlots,
      footerLinks: patch.footerLinks ?? current.footerLinks,
    }, { returning: true });
    return mapToSettings(record);
  }
}

export const casinoSettingsRepository = new CasinoSettingsRepository();
