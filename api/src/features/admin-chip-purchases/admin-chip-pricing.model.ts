import { Model, DataTypes } from 'sequelize';
import type { AdminChipPriceTier } from 'helper';
import { sequelize } from '../../config/sequelize';

/**
 * Tramos de precio propios de un admin. Sin fila, rigen los tramos por
 * defecto (DEFAULT_ADMIN_CHIP_PRICE_TIERS).
 */
export class AdminChipPricingModel extends Model {
  declare adminId: string;
  declare tiers: AdminChipPriceTier[];
  declare updatedBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

AdminChipPricingModel.init(
  {
    adminId: { type: DataTypes.UUID, primaryKey: true, field: 'admin_id' },
    tiers: { type: DataTypes.JSONB, allowNull: false },
    updatedBy: { type: DataTypes.UUID, allowNull: true, field: 'updated_by' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' }
  },
  {
    sequelize,
    tableName: 'admin_chip_pricing',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
);

export default AdminChipPricingModel;
