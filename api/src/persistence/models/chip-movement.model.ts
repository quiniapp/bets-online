import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';
import { ChipMovementType } from 'helper';

export class ChipMovementModel extends Model {
  declare id: string;
  declare userId: string;
  declare relatedUserId: string | null;
  declare type: ChipMovementType;
  declare amount: number;
  declare description: string | null;
  declare previousBalance: number;
  declare newBalance: number;
  declare idempotencyKey: string | null;
  declare createdAt: Date;
}

ChipMovementModel.init(
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
    relatedUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'related_user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(...Object.values(ChipMovementType)),
      allowNull: false,
      field: 'type'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'amount'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description'
    },
    previousBalance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'previous_balance'
    },
    newBalance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'new_balance'
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'idempotency_key'
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
    tableName: 'chip_movements',
    timestamps: false
  }
);

export default ChipMovementModel;
