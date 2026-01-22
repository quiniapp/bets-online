import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export class GameModel extends Model {
  declare id: string;
  declare name: string;
  declare description: string;
  declare isActive: boolean;
  declare minBet: number;
  declare maxBet: number;
  declare houseEdge: number;
  declare providerId: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

GameModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'name'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'description'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_active'
    },
    minBet: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'min_bet',
      validate: {
        min: 0.01
      }
    },
    maxBet: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'max_bet',
      validate: {
        min: 0.01
      }
    },
    houseEdge: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 2.5,
      field: 'house_edge',
      validate: {
        min: 0,
        max: 100
      }
    },
    providerId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'provider_id'
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
    tableName: 'games',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default GameModel;
