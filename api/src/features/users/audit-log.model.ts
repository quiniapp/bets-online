import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export class AuditLogModel extends Model {
  declare id: string;
  declare userId: string | null;
  declare action: string;
  declare entityType: string;
  declare entityId: string | null;
  declare oldValues: object | null;
  declare newValues: object | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare createdAt: Date;
}

AuditLogModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'action'
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'entity_type'
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'entity_id'
    },
    oldValues: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'old_values'
    },
    newValues: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'new_values'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent'
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
    tableName: 'audit_logs',
    timestamps: false
  }
);

export default AuditLogModel;
