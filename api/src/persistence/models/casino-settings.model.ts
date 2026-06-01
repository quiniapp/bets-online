import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/sequelize';
import type { LobbySlot, FooterLink } from 'helper';

export class CasinoSettingsModel extends Model {
  declare id: string;
  declare ownerId: string;
  declare headerCategories: string[];
  declare lobbySlots: LobbySlot[];
  declare footerLinks: FooterLink[];
  declare updatedAt: Date;
  declare createdAt: Date;
}

CasinoSettingsModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'owner_id'
    },
    headerCategories: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'header_categories'
    },
    lobbySlots: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'lobby_slots'
    },
    footerLinks: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'footer_links'
    }
  },
  {
    sequelize,
    tableName: 'casino_settings',
    modelName: 'CasinoSettings',
    timestamps: true,
    underscored: true
  }
);

export default CasinoSettingsModel;
