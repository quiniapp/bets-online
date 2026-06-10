import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export class UserGameProviderBlocklistModel extends Model {
  declare id: string;
  declare userId: string;
  declare providerId: string;
  declare blockedBy: string;
  declare createdAt: Date;
}

UserGameProviderBlocklistModel.init(
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
    providerId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'provider_id'
    },
    blockedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'blocked_by',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  },
  {
    sequelize,
    tableName: 'user_game_provider_blocklist',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'provider_id']
      }
    ]
  }
);

export default UserGameProviderBlocklistModel;
