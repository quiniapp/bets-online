import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';
import { RecoveryMode, RecoveryStatus } from 'helper';

export class RecoveryModel extends Model {
  declare id: string;
  declare adminId: string;
  declare cashierId: string;
  declare relatedMovementId: string | null;
  declare amount: number;
  declare recoveryMode: RecoveryMode;
  declare status: RecoveryStatus;
  declare amountPaid: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

RecoveryModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    adminId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'admin_id',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    cashierId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'cashier_id',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    relatedMovementId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'related_movement_id',
      references: {
        model: 'chip_movements',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'amount',
      validate: {
        min: 0.01
      }
    },
    recoveryMode: {
      type: DataTypes.ENUM(...Object.values(RecoveryMode)),
      allowNull: false,
      field: 'recovery_mode'
    },
    status: {
      type: DataTypes.ENUM(...Object.values(RecoveryStatus)),
      allowNull: false,
      defaultValue: RecoveryStatus.PENDING,
      field: 'status'
    },
    amountPaid: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'amount_paid',
      validate: {
        min: 0
      }
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
    tableName: 'recoveries',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    validate: {
      amountPaidCheck() {
        if (this.amountPaid > this.amount) {
          throw new Error('amount_paid cannot exceed amount');
        }
      }
    }
  }
);

export default RecoveryModel;
