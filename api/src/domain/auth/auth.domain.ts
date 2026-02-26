import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  AuthTokens,
  JwtPayload,
  User,
  UserRole,
  ErrorCode,
  BCRYPT_ROUNDS
} from 'helper';
import { config } from '../../config';
import { usersRepository } from '../../persistence/repositories/users.repository';
import { sessionsRepository } from '../../persistence/repositories/sessions.repository';
import { AppError } from '../../middleware/error.middleware';

export class AuthDomain {
  async login(username: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    // Find user
    const user = await usersRepository.findByUsername(username);

    if (!user) {
      throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid credentials');
    }

    // Check if user is blocked
    if (user.status === 'BLOCKED') {
      throw new AppError(403, ErrorCode.USER_BLOCKED, 'User is blocked');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash!);

    if (!isPasswordValid) {
      throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid credentials');
    }

    // Update last connection
    await usersRepository.updateLastConnection(user.id);

    // Generate tokens
    const tokens = await this.createSession(user);

    // Remove password hash from response
     
    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;

    return {
      user: { ...userWithoutPassword, lastConnection: new Date() } as User,
      tokens
    };
  }

  async register(
    username: string,
    password: string,
    role: UserRole,
    parentUserId?: string,
    email?: string,
    firstName?: string,
    lastName?: string
  ): Promise<User> {
    // Check if username exists
    const existingUsername = await usersRepository.findByUsername(username);
    if (existingUsername) {
      throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'Username already exists');
    }

    // Check if email exists (only if email is provided)
    if (email) {
      const existingEmail = await usersRepository.findByEmail(email);
      if (existingEmail) {
        throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'Email already exists');
      }
    }

    // Validate parent if provided
    if (parentUserId) {
      const parent = await usersRepository.findById(parentUserId);
      if (!parent) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Parent user not found');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const user = await usersRepository.create({
      parentUserId,
      role,
      username,
      email,
      firstName,
      lastName,
      password,
      passwordHash
    });

    // Remove password hash from response
     
    const { passwordHash: _passwordHash2, ...userWithoutPassword } = user;

    return userWithoutPassword as User;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;
    } catch (_error) {
      throw new AppError(401, ErrorCode.INVALID_TOKEN, 'Invalid refresh token');
    }

    // Find session
    const session = await sessionsRepository.findByRefreshToken(refreshToken);
    if (!session) {
      throw new AppError(401, ErrorCode.INVALID_TOKEN, 'Session not found');
    }

    // Check if session expired
    if (session.expiresAt < new Date()) {
      await sessionsRepository.deleteByToken(session.token);
      throw new AppError(401, ErrorCode.TOKEN_EXPIRED, 'Session expired');
    }

    // Get user
    const user = await usersRepository.findById(decoded.userId);
    if (!user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Check if user is blocked
    if (user.status === 'BLOCKED') {
      await sessionsRepository.deleteByUserId(user.id);
      throw new AppError(403, ErrorCode.USER_BLOCKED, 'User is blocked');
    }

    // Delete old session
    await sessionsRepository.deleteByToken(session.token);

    // Create new session
    const tokens = await this.createSession(user);

    return tokens;
  }

  async logout(token: string): Promise<void> {
    await sessionsRepository.deleteByToken(token);
  }

  async logoutAll(userId: string): Promise<void> {
    await sessionsRepository.deleteByUserId(userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash!);
    if (!isPasswordValid) {
      throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password
    await usersRepository.updatePassword(userId, passwordHash);

    // Invalidate all sessions
    await sessionsRepository.deleteByUserId(userId);
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    // Get user
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password
    await usersRepository.updatePassword(userId, passwordHash);

    // Invalidate all sessions
    await sessionsRepository.deleteByUserId(userId);
  }

  private async createSession(user: User): Promise<AuthTokens> {
    const sessionId = uuidv4();

    // Create JWT payload
    const payload: JwtPayload = {
      userId: user.id,
      role: user.role,
      sessionId
    };

    // Generate access token
    const accessToken = jwt.sign(
      payload,
      config.jwt.secret as jwt.Secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      payload,
      config.jwt.refreshSecret as jwt.Secret,
      { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
    );

    // Calculate expiration date (7 days for refresh token)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save session
    await sessionsRepository.create(user.id, accessToken, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken
    };
  }
}

export const authDomain = new AuthDomain();
