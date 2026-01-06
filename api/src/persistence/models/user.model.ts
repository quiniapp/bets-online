import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/sequelize';
import { UserRole, UserStatus } from 'helper';

export class UserModel extends Model {
  declare id: string;
  declare parentUserId: string | null;
  declare role: UserRole;
  declare username: string;
  declare email: string;
  declare passwordHash: string;
  declare status: UserStatus;
  declare createdAt: Date;
  declare updatedAt: Date;
}

UserModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'id'
    },
    parentUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      field: 'role'
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'username'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'email',
      validate: {
        isEmail: true
      }
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash'
    },
    status: {
      type: DataTypes.ENUM(...Object.values(UserStatus)),
      allowNull: false,
      defaultValue: UserStatus.ACTIVE,
      field: 'status'
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
    tableName: 'users',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default UserModel;
