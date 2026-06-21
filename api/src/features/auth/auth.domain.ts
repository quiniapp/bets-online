import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  AuthTokens,
  JwtPayload,
  User,
  UserRole,
  ErrorCode,
  BCRYPT_ROUNDS,
  SESSION_IDLE_MS
} from 'helper';
import { config } from '../../config';
import { usersRepository } from '../users/users.repository';
import { sessionsRepository } from './sessions.repository';
import { userCache } from '../../persistence/cache/user.cache';
import { AppError } from '../../middleware/error.middleware';
import { assertLoginAllowed, registerLoginFailure, clearLoginFailures } from '../../utils/login-throttle';
import { writeAudit } from '../../utils/audit';

// Window during which a just-rotated refresh token's predecessor is still
// honoured, to absorb concurrent refreshes from multiple tabs sharing a cookie.
const REFRESH_GRACE_MS = 60_000;

export class AuthDomain {
  async login(username: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    // Per-account throttle with exponential backoff (the per-IP authLimiter
    // alone is evaded by distributed attacks and punishes CGNAT users)
    assertLoginAllowed(username);

    // Find user
    const user = await usersRepository.findByUsernameForAuth(username);

    if (!user) {
      registerLoginFailure(username);
      writeAudit({
        requesterId: null,
        action: 'auth.loginFailed',
        entityType: 'user',
        entityId: null,
        newValues: { username, reason: 'user_not_found' }
      });
      throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid credentials');
    }

    if (user.status === 'BLOCKED') {
      writeAudit({
        requesterId: user.id,
        action: 'auth.loginBlocked',
        entityType: 'user',
        entityId: user.id,
        newValues: { username }
      });
      throw new AppError(403, ErrorCode.USER_BLOCKED, 'User is blocked');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash!);

    if (!isPasswordValid) {
      registerLoginFailure(username);
      writeAudit({
        requesterId: user.id,
        action: 'auth.loginFailed',
        entityType: 'user',
        entityId: user.id,
        newValues: { username, reason: 'bad_password' }
      });
      throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid credentials');
    }

    clearLoginFailures(username);

    // Update last connection and last activity
    await usersRepository.updateLastConnection(user.id);
    await usersRepository.updateLastActivity(user.id);

    // Generate tokens
    const tokens = await this.createSession(user);

    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    const loggedInUser = { ...userWithoutPassword, lastConnection: new Date() } as User;

    // Poblar caché para que el primer refresh no vaya a DB
    userCache.set(loggedInUser);

    writeAudit({
      requesterId: user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id
    });

    return { user: loggedInUser, tokens };
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
    // Verify refresh token JWT
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;
    } catch (_error) {
      throw new AppError(401, ErrorCode.INVALID_TOKEN, 'Invalid refresh token');
    }

    // Get user — cache first para evitar DB en cada renovación de token
    let user = userCache.get(decoded.userId);
    if (!user) {
      user = await usersRepository.findById(decoded.userId);
      if (!user) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
      }
      userCache.set(user);
    }

    // Check if user is blocked
    if (user.status === 'BLOCKED') {
      await sessionsRepository.deleteByUserId(user.id);
      throw new AppError(403, ErrorCode.USER_BLOCKED, 'User is blocked');
    }

    // Generar nuevos tokens
    const sessionId = uuidv4();
    const payload: JwtPayload = { userId: user.id, role: user.role, sessionId };
    const newAccessToken = jwt.sign(
      payload,
      config.jwt.secret as jwt.Secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );
    const newRefreshToken = jwt.sign(
      payload,
      config.jwt.refreshSecret as jwt.Secret,
      { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
    );
    // Sliding inactivity window: the DB row is the source of truth. If the
    // user was idle past the window, rotateTokens() below finds no live row
    // and the refresh fails → client logs out.
    const expiresAt = new Date(Date.now() + SESSION_IDLE_MS);

    // Rotar sesión: 1 DB op (UPDATE con validación de expiresAt incluida)
    const session = await sessionsRepository.rotateTokens(
      refreshToken,
      newAccessToken,
      newRefreshToken,
      expiresAt
    );

    if (!session) {
      // Concurrent-refresh grace: another request (e.g. another tab sharing the
      // same cookie) may have JUST rotated this refresh token. If so, return the
      // tokens that rotation produced instead of failing — and crucially do NOT
      // revoke the user's other sessions, which was logging legitimate users out
      // on benign races.
      const recent = await sessionsRepository.findRecentlyRotated(refreshToken, REFRESH_GRACE_MS);
      if (recent) {
        return { accessToken: recent.token, refreshToken: recent.refreshToken };
      }
      throw new AppError(401, ErrorCode.INVALID_TOKEN, 'Session not found or expired');
    }

    // Actualizar lastActivity en DB y en caché (cada ~15 min por usuario activo)
    const now = new Date();
    await usersRepository.updateLastActivity(user.id);
    userCache.set({ ...user, lastActivity: now });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(token: string): Promise<void> {
    await sessionsRepository.deleteByToken(token);
    const decoded = jwt.decode(token) as { userId?: string } | null;
    writeAudit({
      requesterId: decoded?.userId ?? null,
      action: 'auth.logout',
      entityType: 'user',
      entityId: decoded?.userId ?? null
    });
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
    const user = await usersRepository.findByIdForAuth(userId);
    if (!user) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash!);
    if (!isPasswordValid) {
      throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password
    await usersRepository.updatePassword(userId, passwordHash);

    // Invalidate user cache and all sessions
    userCache.invalidate(userId);
    await sessionsRepository.deleteByUserId(userId);

    writeAudit({
      requesterId: userId,
      action: 'auth.passwordChange',
      entityType: 'user',
      entityId: userId
    });
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

    // Invalidate user cache and all sessions
    userCache.invalidate(userId);
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

    // Session row expires after the inactivity window; every authenticated
    // request / refresh / activity ping slides it forward.
    const expiresAt = new Date(Date.now() + SESSION_IDLE_MS);

    // Save session
    await sessionsRepository.create(user.id, accessToken, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken
    };
  }
}

export const authDomain = new AuthDomain();
