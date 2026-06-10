import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../../config/sequelize';

export class UserProviderProfileModel extends Model {
  declare id: string;
  declare userId: string;
  declare providerName: string;
  declare providerPlayerId: string;
  declare currency: string;
  declare countryCode: string;
  declare isActive: boolean;
  declare currentProviderGameId: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

UserProviderProfileModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    providerName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'provider_name'
    },
    providerPlayerId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'provider_player_id'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'ARS',
      field: 'currency'
    },
    countryCode: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: 'AR',
      field: 'country_code'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    currentProviderGameId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      field: 'current_provider_game_id'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    tableName: 'user_provider_profiles',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default UserProviderProfileModel;
