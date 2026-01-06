import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';

export class SessionModel extends Model {
  declare id: string;
  declare userId: string;
  declare token: string;
  declare refreshToken: string;
  declare expiresAt: Date;
  declare createdAt: Date;
}

SessionModel.init(
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
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'token'
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'refresh_token'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
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
    tableName: 'sessions',
    timestamps: false
  }
);

export default SessionModel;
