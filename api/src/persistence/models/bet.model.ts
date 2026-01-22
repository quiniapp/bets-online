import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export enum BetStatus {
  PENDING = 'PENDING',
  WON = 'WON',
  LOST = 'LOST',
  CANCELLED = 'CANCELLED',
}

export interface BetResultData {
  gameType?: string;
  randomValue?: number;
  winProbability?: number;
  timestamp?: string;
  houseEdge?: number;
  [key: string]: unknown;
}

export class BetModel extends Model {
  declare id: string;
  declare userId: string;
  declare gameId: string;
  declare amount: number;
  declare status: BetStatus;
  declare multiplier: number | null;
  declare payout: number | null;
  declare resultData: BetResultData | null;
  declare createdAt: Date;
  declare settledAt: Date | null;
}

BetModel.init(
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
      }
    },
    gameId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'game_id',
      references: {
        model: 'games',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'amount',
      validate: {
        min: 0.01
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BetStatus)),
      defaultValue: BetStatus.PENDING,
      allowNull: false,
      field: 'status'
    },
    multiplier: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'multiplier'
    },
    payout: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'payout'
    },
    resultData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'result_data'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    settledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'settled_at'
    }
  },
  {
    sequelize,
    tableName: 'bets',
    timestamps: false,
    underscored: true
  }
);

export default BetModel;
