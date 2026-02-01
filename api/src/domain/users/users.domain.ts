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
import { usersRepository } from '../../persistence/repositories/users.repository';
import { balancesRepository } from '../../persistence/repositories/balances.repository';
import { authDomain } from '../auth/auth.domain';
import { AppError } from '../../middleware/error.middleware';

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

    return user;
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
  }

  private async buildUserTree(userId: string): Promise<UserTreeNode> {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    const balance = await balancesRepository.findByUserId(userId);
    // For tree view, get all children without pagination
    const { users: children } = await usersRepository.findByParentId(userId, { limit: 1000 });

    const childNodes = await Promise.all(
      children.map(child => this.buildUserTree(child.id))
    );

    // Remove password hash
     
    const { passwordHash: _passwordHash3, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as User,
      balance: balance || { id: '', userId, chipBalance: 0, lastUpdatedAt: new Date() },
      children: childNodes
    };
  }

  private async canViewUser(requesterId: string, targetId: string): Promise<boolean> {
    if (requesterId === targetId) {
      return true;
    }

    // Check if target is in requester's subtree
    const descendants = await usersRepository.findDescendants(requesterId);
    return descendants.some(d => d.id === targetId);
  }
}

export const usersDomain = new UsersDomain();
