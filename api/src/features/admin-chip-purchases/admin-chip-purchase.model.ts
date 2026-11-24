import { Model, DataTypes } from 'sequelize';
import { AdminChipPurchaseStatus } from 'helper';
import { sequelize } from '../../config/sequelize';

/**
 * Carga de fichas del owner a un admin, con su precio diferencial.
 * El pago queda PENDING hasta que el owner confirma que lo recibió.
 */
export class AdminChipPurchaseModel extends Model {
  declare id: string;
  declare receiptNumber: number;
  declare adminId: string;
  declare chips: number;
  declare percentage: number;
  declare amount: number;
  declare manualPercentage: boolean;
  declare status: AdminChipPurchaseStatus;
  declare chipMovementId: string | null;
  declare paymentReference: string | null;
  declare notes: string | null;
  declare createdBy: string | null;
  declare confirmedBy: string | null;
  declare confirmedAt: Date | null;
  declare canceledBy: string | null;
  declare canceledAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

AdminChipPurchaseModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    // SERIAL en la base: no lo manda el INSERT.
    receiptNumber: { type: DataTypes.INTEGER, autoIncrement: true, field: 'receipt_number' },
    adminId: { type: DataTypes.UUID, allowNull: false, field: 'admin_id' },
    chips: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    manualPercentage: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'manual_percentage'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: AdminChipPurchaseStatus.PENDING
    },
    chipMovementId: { type: DataTypes.UUID, allowNull: true, field: 'chip_movement_id' },
    paymentReference: { type: DataTypes.STRING(255), allowNull: true, field: 'payment_reference' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
    confirmedBy: { type: DataTypes.UUID, allowNull: true, field: 'confirmed_by' },
    confirmedAt: { type: DataTypes.DATE, allowNull: true, field: 'confirmed_at' },
    canceledBy: { type: DataTypes.UUID, allowNull: true, field: 'canceled_by' },
    canceledAt: { type: DataTypes.DATE, allowNull: true, field: 'canceled_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' }
  },
  {
    sequelize,
    tableName: 'admin_chip_purchases',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
);

export default AdminChipPurchaseModel;
