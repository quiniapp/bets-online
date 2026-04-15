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

  // Housekeeping: borra rows con expiresAt < NOW().
  // No es crítico porque las sesiones expiradas ya son rechazadas en el query de refresh.
  // Descomentar y llamar desde cacheSyncJob si el volumen de usuarios genera acumulación.
  // async deleteExpired(): Promise<void> {
  //   await SessionModel.destroy({
  //     where: {
  //       expiresAt: {
  //         [Op.lt]: new Date()
  //       }
  //     }
  //   });
  // }

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
