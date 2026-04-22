import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export class UserFavoriteGameModel extends Model {
  declare id: string;
  declare userId: string;
  declare gameId: string;
  declare createdAt: Date;
}

UserFavoriteGameModel.init(
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
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    gameId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'game_id',
      references: { model: 'games', key: 'id' },
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
    tableName: 'user_favorite_games',
    timestamps: false,
    underscored: true
  }
);

export default UserFavoriteGameModel;
