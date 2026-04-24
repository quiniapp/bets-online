import { Op } from 'sequelize';
import { UserModel } from '../models';
import { User, CreateUserDto, UpdateUserDto, UserStatus } from 'helper';
import { sequelize } from '../../config/sequelize';

export class UsersRepository {
  async findById(id: string): Promise<User | null> {
    const user = await UserModel.findByPk(id);
    if (!user) return null;
    return this.mapToUser(user);
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await UserModel.findOne({
      where: { username }
    });
    if (!user) return null;
    return this.mapToUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findOne({
      where: { email }
    });
    if (!user) return null;
    return this.mapToUser(user);
  }

  async findByParentId(
    parentId: string,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
    }
  ): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 10, search } = options || {};
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = search && search.length >= 3
      ? {
          parentUserId: parentId,
          [Op.or]: [
            { username: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } }
          ]
        }
      : { parentUserId: parentId };

    const { count, rows } = await UserModel.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      users: rows.map(this.mapToUser),
      total: count
    };
  }

  async create(userData: CreateUserDto & { passwordHash: string }): Promise<User> {
    const transaction = await sequelize.transaction();

    try {
       
      const { password: _password, ...rest } = userData as CreateUserDto & { passwordHash: string };

      const user = await UserModel.create(
        {
          parentUserId: rest.parentUserId || null,
          role: rest.role,
          username: rest.username,
          email: rest.email || null,
          firstName: rest.firstName || null,
          lastName: rest.lastName || null,
          passwordHash: rest.passwordHash,
          status: 'ACTIVE'
        },
        { transaction }
      );

      // Create initial balance using raw query to avoid circular import
      await sequelize.query(
        'INSERT INTO balances (id, user_id, chip_balance, last_updated_at) VALUES (gen_random_uuid(), :userId, 0, NOW())',
        {
          replacements: { userId: user.id },
          transaction
        }
      );

      await transaction.commit();
      return this.mapToUser(user);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(id: string, updateData: UpdateUserDto): Promise<User> {
    const user = await UserModel.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }

    const updateFields: Partial<UpdateUserDto> = {};
    if (updateData.username) updateFields.username = updateData.username;
    if (updateData.email !== undefined) updateFields.email = updateData.email || undefined;
    if (updateData.firstName !== undefined) updateFields.firstName = updateData.firstName || undefined;
    if (updateData.lastName !== undefined) updateFields.lastName = updateData.lastName || undefined;
    if (updateData.status) updateFields.status = updateData.status;

    await user.update(updateFields);
    return this.mapToUser(user);
  }

  async updateLastConnection(id: string): Promise<void> {
    const user = await UserModel.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }
    await user.update({ lastConnection: new Date() });
  }

  async updateLastActivity(id: string): Promise<void> {
    await UserModel.update(
      { lastActivity: new Date() },
      { where: { id } }
    );
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const user = await UserModel.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }
    await user.update({ passwordHash });
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await UserModel.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }
    await user.update({ status });
    return this.mapToUser(user);
  }

  async delete(id: string): Promise<void> {
    const user = await UserModel.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }
    await user.destroy();
  }

  async getDescendantsStats(userId: string): Promise<{
    total: number; active: number; blocked: number;
    admins: number; cashiers: number; players: number;
  }> {
    const query = `
      WITH RECURSIVE descendants AS (
        SELECT id, role, status FROM users WHERE id = :userId
        UNION ALL
        SELECT u.id, u.role, u.status FROM users u
        INNER JOIN descendants d ON u.parent_user_id = d.id
      )
      SELECT
        COUNT(*) - 1 AS total,
        SUM(CASE WHEN status = 'ACTIVE' AND id != :userId THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status != 'ACTIVE' AND id != :userId THEN 1 ELSE 0 END) AS blocked,
        SUM(CASE WHEN role = 'ADMIN' AND id != :userId THEN 1 ELSE 0 END) AS admins,
        SUM(CASE WHEN role = 'CASHIER' AND id != :userId THEN 1 ELSE 0 END) AS cashiers,
        SUM(CASE WHEN role = 'PLAYER' AND id != :userId THEN 1 ELSE 0 END) AS players
      FROM descendants
    `;
    const [rows] = await sequelize.query(query, {
      replacements: { userId },
      type: 'SELECT' as any
    });
    const r = rows as any;
    return {
      total: parseInt(r.total, 10) || 0,
      active: parseInt(r.active, 10) || 0,
      blocked: parseInt(r.blocked, 10) || 0,
      admins: parseInt(r.admins, 10) || 0,
      cashiers: parseInt(r.cashiers, 10) || 0,
      players: parseInt(r.players, 10) || 0,
    };
  }

  async findDescendants(userId: string): Promise<User[]> {
    // Use recursive CTE to get all descendants
    const query = `
      WITH RECURSIVE descendants AS (
        SELECT * FROM users WHERE id = :userId
        UNION ALL
        SELECT u.* FROM users u
        INNER JOIN descendants d ON u.parent_user_id = d.id
      )
      SELECT * FROM descendants WHERE id != :userId
    `;

    const results = await sequelize.query(query, {
      replacements: { userId },
      type: 'SELECT'
    });

    return (results as Record<string, unknown>[]).map(this.mapToUser);
  }

  // Fallback method for getting descendants without recursive CTE
  // Keeping this for reference in case recursive CTE doesn't work in some databases
  /*
  private async getDescendantsManually(userId: string): Promise<User[]> {
    const descendants: User[] = [];
    const children = await this.findByParentId(userId);

    for (const child of children) {
      descendants.push(child);
      const grandChildren = await this.getDescendantsManually(child.id);
      descendants.push(...grandChildren);
    }

    return descendants;
  }
  */

  private mapToUser(data: UserModel | Record<string, unknown>): User {
    // Convert Sequelize model to plain object if needed
    const plain = data instanceof UserModel ? data.get({ plain: true }) : data;

    const lastConn = plain.lastConnection || plain.last_connection;
    const lastActivity = plain.lastActivity || plain.last_activity;

    return {
      id: plain.id as string,
      parentUserId: (plain.parentUserId || plain.parent_user_id) as string | null,
      role: plain.role as User['role'],
      username: plain.username as string,
      email: (plain.email as string) || null,
      firstName: (plain.firstName || plain.first_name) as string | null,
      lastName: (plain.lastName || plain.last_name) as string | null,
      passwordHash: (plain.passwordHash || plain.password_hash) as string,
      status: plain.status as UserStatus,
      lastConnection: lastConn ? new Date(lastConn as string | Date) : null,
      lastActivity: lastActivity ? new Date(lastActivity as string | Date) : null,
      createdAt: new Date(plain.createdAt || plain.created_at),
      updatedAt: new Date(plain.updatedAt || plain.updated_at)
    };
  }
}

export const usersRepository = new UsersRepository();
