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
      field: 'owner_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'casino_settings',
    modelName: 'CasinoSettings',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default CasinoSettingsModel;
