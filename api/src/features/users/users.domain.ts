import {
  User,
  CreateUserDto,
  UpdateUserDto,
  UserRole,
  UserStatus,
  UserTreeNode,
  ErrorCode,
  canManageUser
} from 'helper';
import { usersRepository } from './users.repository';
import { balancesRepository } from '../chips/balances.repository';
import { sessionsRepository } from '../auth/sessions.repository';
import { userCache } from '../../persistence/cache/user.cache';
import { authDomain } from '../auth/auth.domain';
import { chipsDomain } from '../chips/chips.domain';
import { AppError } from '../../middleware/error.middleware';
import { writeAudit } from '../../utils/audit';

export class UsersDomain {
  async createUser(
    creatorId: string,
    userData: CreateUserDto
  ): Promise<User> {
    // Get creator user
    const creator = await usersRepository.findById(creatorId);
    if (!creator) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Creator not found');
    }

    // Validate that creator can create this type of user
    if (!canManageUser(creator.role, userData.role)) {
      throw new AppError(
        403,
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        'Cannot create user with this role'
      );
    }

    // Validate initial balance against creator's available balance before creating user
    if (userData.initialBalance && userData.initialBalance > 0 && creator.role !== UserRole.OWNER) {
      const creatorBalance = await balancesRepository.findByUserId(creatorId);
      if (!creatorBalance || creatorBalance.chipBalance < userData.initialBalance) {
        throw new AppError(400, ErrorCode.INSUFFICIENT_BALANCE, 'Saldo insuficiente para asignar el balance inicial');
      }
    }

    // Set parent as creator
    userData.parentUserId = creatorId;

    // Register user
    const user = await authDomain.register(
      userData.username,
      userData.password,
      userData.role,
      userData.parentUserId,
      userData.email,
      userData.firstName,
      userData.lastName
    );

    if (userData.initialBalance && userData.initialBalance > 0) {
      await chipsDomain.sellChips(creatorId, user.id, userData.initialBalance, 'Balance inicial');
    }

    writeAudit({
      requesterId: creatorId,
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      newValues: { username: user.username, role: user.role, initialBalance: userData.initialBalance ?? 0 }
    });
    return user;
  }

  async getUserStats(requesterId: string) {
    const requester = await usersRepository.findById(requesterId);
    if (!requester) throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    return usersRepository.getDescendantsStats(requesterId);
  }

  async searchDescendants(
    requesterId: string,
    search: string,
    roles: UserRole[],
    limit = 10
  ): Promise<Pick<User, 'id' | 'role' | 'username'>[]> {
    const requester = await usersRepository.findById(requesterId);
    if (!requester) throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');

    const allowedByRole: Record<string, UserRole[]> = {
      [UserRole.OWNER]: [UserRole.ADMIN, UserRole.CASHIER, UserRole.PLAYER],
      [UserRole.ADMIN]: [UserRole.CASHIER, UserRole.PLAYER],
      [UserRole.CASHIER]: [UserRole.PLAYER],
    };
    const allowed = allowedByRole[requester.role] ?? [];
    const filteredRoles = roles.length > 0 ? roles.filter(r => allowed.includes(r)) : allowed;
    if (filteredRoles.length === 0) return [];

    return usersRepository.searchDescendants(requesterId, search, filteredRoles, limit);
  }

  async getUserById(requesterId: string, userId: string): Promise<User> {
    // Get requester
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Requester not found');
    }

    // Get target user
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Check permissions
    if (requester.role !== UserRole.OWNER) {
      const canView = await this.canViewUser(requesterId, userId);
      if (!canView) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Cannot view this user'
        );
      }
    }

    // Remove password hash
     
    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;

    return userWithoutPassword as User;
  }

  async getUserChildren(
    requesterId: string,
    userId?: string,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
    }
  ): Promise<{ users: User[]; total: number; page: number; limit: number; totalPages: number }> {
    const targetId = userId || requesterId;
    const { page = 1, limit = 10, search } = options || {};

    // Get requester
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Requester not found');
    }

    // Check permissions
    if (requester.role !== UserRole.OWNER && targetId !== requesterId) {
      const canView = await this.canViewUser(requesterId, targetId);
      if (!canView) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Cannot view users'
        );
      }
    }

    // Get children with pagination and search
    const result = await usersRepository.findByParentId(targetId, { page, limit, search });

    // Remove password hashes
     
    const users = result.users.map(({ passwordHash: _passwordHash, ...user }) => user as User);

    return {
      users,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  }

  async getUserTree(requesterId: string, userId?: string): Promise<UserTreeNode> {
    const targetId = userId || requesterId;

    // Get requester
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Requester not found');
    }

    // Check permissions
    if (requester.role !== UserRole.OWNER && targetId !== requesterId) {
      const canView = await this.canViewUser(requesterId, targetId);
      if (!canView) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Cannot view user tree'
        );
      }
    }

    return this.buildUserTree(targetId);
  }

  async updateUser(
    requesterId: string,
    userId: string,
    updateData: UpdateUserDto
  ): Promise<User> {
    // Get requester
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Requester not found');
    }

    // Get target user
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Check permissions
    if (requester.role !== UserRole.OWNER) {
      // Can only modify users in their subtree
      const canModify = await this.canViewUser(requesterId, userId);
      if (!canModify) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Cannot modify this user'
        );
      }

      // Cannot modify users of higher or equal role
      if (!canManageUser(requester.role, user.role)) {
        throw new AppError(
          403,
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          'Cannot modify user with this role'
        );
      }
    }

    // Update user
    const updatedUser = await usersRepository.update(userId, updateData);

    // Si cambió el status: refrescar caché siempre (authMiddleware la consulta
    // para revocar BLOCKED al instante) y terminar todas las sesiones activas
    if ('status' in updateData) {
      const { passwordHash: _ph, ...cacheable } = updatedUser;
      userCache.set(cacheable as User);
      if (updateData.status === UserStatus.BLOCKED) {
        await sessionsRepository.deleteByUserId(userId);
      }
    }

    writeAudit({
      requesterId,
      action: updateData.status === UserStatus.BLOCKED ? 'user.block'
        : updateData.status === UserStatus.ACTIVE && user.status === UserStatus.BLOCKED ? 'user.unblock'
        : 'user.update',
      entityType: 'user',
      entityId: userId,
      oldValues: { status: user.status, role: user.role },
      newValues: updateData as object
    });

    // Remove password hash

    const { passwordHash: _passwordHash2, ...userWithoutPassword } = updatedUser;

    return userWithoutPassword as User;
  }

  async blockUser(requesterId: string, userId: string): Promise<User> {
    return this.updateUser(requesterId, userId, { status: UserStatus.BLOCKED });
  }

  async unblockUser(requesterId: string, userId: string): Promise<User> {
    return this.updateUser(requesterId, userId, { status: UserStatus.ACTIVE });
  }

  async resetUserPassword(
    requesterId: string,
    userId: string,
    newPassword: string
  ): Promise<void> {
    // Get requester
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Requester not found');
    }

    // Get target user
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Check permissions
    if (requester.role !== UserRole.OWNER) {
      // Can only reset password for users in their subtree
      const canModify = await this.canViewUser(requesterId, userId);
      if (!canModify) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Cannot reset password for this user'
        );
      }

      // Cannot reset password for users of higher or equal role
      if (!canManageUser(requester.role, user.role)) {
        throw new AppError(
          403,
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          'Cannot reset password for user with this role'
        );
      }
    }

    // Reset password
    await authDomain.resetPassword(userId, newPassword);

    writeAudit({
      requesterId,
      action: 'user.resetPassword',
      entityType: 'user',
      entityId: userId
    });
  }

  // Whole subtree in 2 queries (recursive CTE + bulk balances) assembled in
  // memory. The previous per-node recursion issued 3 queries per descendant
  // and made /users/me/tree take seconds with a few hundred users.
  private async buildUserTree(userId: string): Promise<UserTreeNode> {
    const rootUser = await usersRepository.findById(userId);
    if (!rootUser) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    const descendants = await usersRepository.findDescendants(userId);
    const allUsers = [rootUser, ...descendants];
    const balances = await balancesRepository.findByUserIds(allUsers.map(u => u.id));
    const balanceByUserId = new Map(balances.map(b => [b.userId, b]));

    const childrenByParent = new Map<string, User[]>();
    for (const u of descendants) {
      if (!u.parentUserId) continue;
      const siblings = childrenByParent.get(u.parentUserId);
      if (siblings) siblings.push(u);
      else childrenByParent.set(u.parentUserId, [u]);
    }

    const build = (user: User): UserTreeNode => {

      const { passwordHash: _passwordHash3, ...userWithoutPassword } = user;
      const children = (childrenByParent.get(user.id) ?? [])
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return {
        user: userWithoutPassword as User,
        balance: balanceByUserId.get(user.id) ??
          { id: '', userId: user.id, chipBalance: 0, lastUpdatedAt: new Date() },
        children: children.map(build)
      };
    };

    return build(rootUser);
  }

  private async canViewUser(requesterId: string, targetId: string): Promise<boolean> {
    if (requesterId === targetId) {
      return true;
    }

    // Check if target is in requester's subtree
    return usersRepository.isDescendant(requesterId, targetId);
  }
}

export const usersDomain = new UsersDomain();
