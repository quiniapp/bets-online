import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export class ProviderGameTypeOrderModel extends Model {
  declare id: string;
  declare providerName: string;
  declare gameType: string;
  declare sortOrder: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ProviderGameTypeOrderModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    providerName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'provider_name'
    },
    gameType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'game_type'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sort_order'
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
    tableName: 'provider_game_type_orders',
    modelName: 'ProviderGameTypeOrder',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['provider_name', 'game_type'] }
    ],
  }
);

export default ProviderGameTypeOrderModel;
