import { SessionModel } from '../models';
import { Session } from 'helper';
import { Op } from 'sequelize';
import { sessionCache } from '../cache/session.cache';

export class SessionsRepository {
  async create(
    userId: string,
    token: string,
    refreshToken: string,
    expiresAt: Date
  ): Promise<Session> {
    const session = await SessionModel.create({
      userId,
      token,
      refreshToken,
      expiresAt
    });

    const mapped = this.mapToSession(session);
    sessionCache.set(mapped);
    return mapped;
  }

  async findByToken(token: string): Promise<Session | null> {
    const cached = sessionCache.getByToken(token);
    if (cached) return cached;

    const session = await SessionModel.findOne({
      where: { token }
    });

    if (!session) return null;
    const mapped = this.mapToSession(session);
    sessionCache.set(mapped);
    return mapped;
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const cached = sessionCache.getByRefreshToken(refreshToken);
    if (cached) return cached;

    const session = await SessionModel.findOne({
      where: { refreshToken }
    });

    if (!session) return null;
    const mapped = this.mapToSession(session);
    sessionCache.set(mapped);
    return mapped;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const sessions = await SessionModel.findAll({
      where: {
        userId,
        expiresAt: {
          [Op.gte]: new Date()
        }
      }
    });

    return sessions.map(this.mapToSession);
  }

  async deleteByToken(token: string): Promise<void> {
    sessionCache.invalidateByToken(token);
    await SessionModel.destroy({
      where: { token }
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    sessionCache.invalidateByUserId(userId);
    await SessionModel.destroy({
      where: { userId }
    });
  }

  async deleteExpired(): Promise<void> {
    await SessionModel.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date()
        }
      }
    });
  }

  private mapToSession(data: SessionModel | Record<string, unknown>): Session {
    // Convert Sequelize model to plain object if needed
    const plain = data instanceof SessionModel ? data.get({ plain: true }) : data;

    return {
      id: plain.id as string,
      userId: (plain.userId || plain.user_id) as string,
      token: plain.token as string,
      refreshToken: (plain.refreshToken || plain.refresh_token) as string,
      expiresAt: new Date(plain.expiresAt || plain.expires_at),
      createdAt: new Date(plain.createdAt || plain.created_at)
    };
  }
}

export const sessionsRepository = new SessionsRepository();
