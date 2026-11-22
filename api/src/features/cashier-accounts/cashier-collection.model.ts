import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

/**
 * Cobro del owner a un cajero. Cada liquidación registra su cobro inicial
 * (si lo hubo) y después se pueden sumar cobros posteriores.
 */
export class CashierCollectionModel extends Model {
  declare id: string;
  declare settlementId: string;
  declare cashierId: string;
  declare amount: number;
  declare paymentReference: string | null;
  declare createdBy: string | null;
  declare createdAt: Date;
}

CashierCollectionModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    settlementId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'settlement_id',
      references: { model: 'cashier_settlements', key: 'id' },
      onDelete: 'CASCADE'
    },
    cashierId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'cashier_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'amount'
    },
    paymentReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payment_reference'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
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
    tableName: 'cashier_collections',
    timestamps: false
  }
);

export default CashierCollectionModel;
