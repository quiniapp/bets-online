import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../../config/sequelize';

export class GameLaunchModel extends Model {
  declare id: string;
  declare gameId: string;
  declare userId: string;
  declare createdAt: Date;
}

GameLaunchModel.init(
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
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
    tableName: 'game_launches',
    timestamps: false
  }
);
