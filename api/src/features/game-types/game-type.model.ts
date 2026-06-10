import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export class GameTypeModel extends Model {
  declare id: string;
  declare name: string;
  declare displayName: string | null;
  declare sortOrder: number | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

GameTypeModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'name'
    },
    displayName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'display_name'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      field: 'sort_order'
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
    tableName: 'game_types',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default GameTypeModel;
