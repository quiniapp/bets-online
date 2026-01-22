import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export class BalanceModel extends Model {
  declare id: string;
  declare userId: string;
  declare chipBalance: number;
  declare lastUpdatedAt: Date;
}

BalanceModel.init(
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
      unique: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    chipBalance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'chip_balance'
    },
    lastUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'last_updated_at'
    }
  },
  {
    sequelize,
    tableName: 'balances',
    timestamps: false
  }
);

export default BalanceModel;
