import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export class GameImageModel extends Model {
  declare id: string;
  declare gameId: string;
  declare url: string;
  declare label: string | null;
  declare createdAt: Date;
}

GameImageModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    gameId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'game_id'
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'url'
    },
    label: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'label'
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
    tableName: 'game_images',
    timestamps: false,
    underscored: true
  }
);

export default GameImageModel;
