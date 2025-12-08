import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';
import { CompensationType } from 'helper';

export class CashierCompensationModeModel extends Model {
  declare id: string;
  declare cashierId: string;
  declare type: CompensationType;
  declare percentage: number | null;
  declare activeFrom: Date;
  declare activeTo: Date | null;
  declare createdAt: Date;
}

CashierCompensationModeModel.init(
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
    type: {
      type: DataTypes.ENUM(...Object.values(CompensationType)),
      allowNull: false,
      field: 'type'
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'percentage',
      validate: {
        min: 0,
        max: 100
      }
    },
    activeFrom: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'active_from'
    },
    activeTo: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'active_to'
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
    tableName: 'cashier_compensation_modes',
    timestamps: false
  }
);

export default CashierCompensationModeModel;
