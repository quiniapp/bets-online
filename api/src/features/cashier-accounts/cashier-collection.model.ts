import { Model, DataTypes } from 'sequelize';
import { CashierCollectionKind, CashierCollectionStatus } from 'helper';
import { sequelize } from '../../config/sequelize';

/**
 * Cobro del owner a un cajero.
 * - ON_ACCOUNT: cobro a cuenta durante la semana; settlementId null hasta que
 *   una liquidación lo descuenta.
 * - SETTLEMENT: el cobro que se fija al liquidar; queda PENDING hasta que el
 *   owner confirma que lo recibió.
 */
export class CashierCollectionModel extends Model {
  declare id: string;
  declare settlementId: string | null;
  declare cashierId: string;
  declare kind: CashierCollectionKind;
  declare status: CashierCollectionStatus;
  declare amount: number;
  declare paymentReference: string | null;
  declare notes: string | null;
  declare createdBy: string | null;
  declare createdAt: Date;
  declare confirmedBy: string | null;
  declare confirmedAt: Date | null;
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
      allowNull: true,
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
    kind: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: CashierCollectionKind.SETTLEMENT,
      field: 'kind'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: CashierCollectionStatus.CONFIRMED,
      field: 'status'
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
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'notes'
    },
    confirmedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'confirmed_by',
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'confirmed_at'
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
