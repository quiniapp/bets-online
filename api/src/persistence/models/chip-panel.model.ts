import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';
import { PanelStatus } from 'helper';

export class ChipPanelModel extends Model {
  declare id: string;
  declare cashierId: string;
  declare buyPricePerChip: number;
  declare sellPricePerChip: number;
  declare totalChips: number;
  declare soldChips: number;
  declare status: PanelStatus;
  declare createdAt: Date;
  declare settledAt: Date | null;
}

ChipPanelModel.init(
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
    buyPricePerChip: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'buy_price_per_chip',
      validate: {
        min: 0.01
      }
    },
    sellPricePerChip: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'sell_price_per_chip',
      validate: {
        min: 0.01
      }
    },
    totalChips: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'total_chips',
      validate: {
        min: 1
      }
    },
    soldChips: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sold_chips',
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PanelStatus)),
      allowNull: false,
      defaultValue: PanelStatus.OPEN,
      field: 'status'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    settledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'settled_at'
    }
  },
  {
    sequelize,
    tableName: 'chip_panels',
    timestamps: false,
    validate: {
      priceCheck(this: ChipPanelModel) {
        if (this.sellPricePerChip <= this.buyPricePerChip) {
          throw new Error('sell_price_per_chip must be greater than buy_price_per_chip');
        }
      },
      soldChipsCheck(this: ChipPanelModel) {
        if (this.soldChips > this.totalChips) {
          throw new Error('sold_chips cannot exceed total_chips');
        }
      }
    }
  }
);

export default ChipPanelModel;
