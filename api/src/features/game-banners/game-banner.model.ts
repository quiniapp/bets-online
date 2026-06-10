import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export class GameBannerModel extends Model {
  declare id: string;
  declare gameId: string | null;
  declare sortOrder: number;
  declare isActive: boolean;
  declare imageUrl: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

GameBannerModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    gameId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'game_id'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'image_url'
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
    tableName: 'game_banners',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default GameBannerModel;
