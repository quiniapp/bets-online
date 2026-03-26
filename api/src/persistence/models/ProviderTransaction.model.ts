import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';
import { TransactionType, BetType, GameRoundStatus, BetOutcomeEventData } from 'helper';

export class ProviderTransactionModel extends Model {
  declare id: string;
  declare providerName: string;
  declare providerTransactionId: string;
  declare providerGameRoundId: string | null;
  declare providerGameId: string | null;
  declare providerPlayerId: string;
  declare userId: string;
  declare transactionType: TransactionType;
  declare betType: BetType | null;
  declare gameRoundStatus: GameRoundStatus | null;
  declare amount: string;
  declare currency: string;
  declare balanceAfter: string;
  declare betOutcomeEventData: BetOutcomeEventData | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ProviderTransactionModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    providerName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'provider_name'
    },
    providerTransactionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'provider_transaction_id'
    },
    providerGameRoundId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'provider_game_round_id'
    },
    providerGameId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'provider_game_id'
    },
    providerPlayerId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'provider_player_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    transactionType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'transaction_type'
    },
    betType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'bet_type'
    },
    gameRoundStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'game_round_status'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: false,
      field: 'amount'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      field: 'currency'
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'balance_after'
    },
    betOutcomeEventData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'bet_outcome_event_data'
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
    tableName: 'provider_transactions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default ProviderTransactionModel;
