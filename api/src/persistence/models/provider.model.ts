import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export class ProviderModel extends Model {
  declare id: string;
  declare name: string;
  declare displayName: string | null;
  declare isActive: boolean;
  declare logoUrl: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ProviderModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'name'
    },
    displayName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'display_name'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_active'
    },
    logoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'logo_url'
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
    tableName: 'providers',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default ProviderModel;
