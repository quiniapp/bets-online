import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';
import { CompensationType, SettlementStatus } from 'helper';

export class CashierSettlementModel extends Model {
  declare id: string;
  declare cashierId: string;
  declare periodStart: Date;
  declare periodEnd: Date;
  declare totalSales: number;
  declare totalPrizesPaid: number;
  declare profit: number;
  declare payableAmount: number;
  declare status: SettlementStatus;
  declare compensationType: CompensationType | null;
  declare percentage: number | null;
  declare notes: string | null;
  declare createdBy: string | null;
  declare paidBy: string | null;
  declare paymentReference: string | null;
  declare createdAt: Date;
  declare paidAt: Date | null;
}

CashierSettlementModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
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
    periodStart: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'period_start'
    },
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'period_end'
    },
    totalSales: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_sales'
    },
    totalPrizesPaid: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_prizes_paid'
    },
    profit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'profit'
    },
    payableAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'payable_amount'
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SettlementStatus)),
      allowNull: false,
      defaultValue: SettlementStatus.PENDING,
      field: 'status'
    },
    compensationType: {
      type: DataTypes.ENUM(...Object.values(CompensationType)),
      allowNull: true,
      field: 'compensation_type'
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'percentage'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'notes'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    paidBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'paid_by',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    paymentReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payment_reference'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'paid_at'
    }
  },
  {
    sequelize,
    tableName: 'cashier_settlements',
    timestamps: false,
    validate: {
      periodCheck(this: CashierSettlementModel) {
        if (this.periodEnd <= this.periodStart) {
          throw new Error('period_end must be after period_start');
        }
      }
    }
  }
);

export default CashierSettlementModel;
