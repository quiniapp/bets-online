import { SessionModel } from '../models';
import { Session } from 'helper';
import { Op } from 'sequelize';

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

    return this.mapToSession(session);
  }

  async findByToken(token: string): Promise<Session | null> {
    const session = await SessionModel.findOne({
      where: { token }
    });

    if (!session) return null;
    return this.mapToSession(session);
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const session = await SessionModel.findOne({
      where: { refreshToken }
    });

    if (!session) return null;
    return this.mapToSession(session);
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
    await SessionModel.destroy({
      where: { token }
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
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

  private mapToSession(data: Record<string, unknown>): Session {
    return {
      id: data.id,
      userId: data.userId || data.user_id,
      token: data.token,
      refreshToken: data.refreshToken || data.refresh_token,
      expiresAt: new Date(data.expiresAt || data.expires_at),
      createdAt: new Date(data.createdAt || data.created_at)
    };
  }
}

export const sessionsRepository = new SessionsRepository();
