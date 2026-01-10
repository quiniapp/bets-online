import { BetModel, BetStatus } from '../models/bet.model';
import { Bet } from 'helper';
import { Transaction, WhereOptions } from 'sequelize';

export interface CreateBetData {
  userId: string;
  gameId: string;
  amount: number;
  status?: BetStatus;
  multiplier?: number;
  payout?: number;
  resultData?: Record<string, unknown>;
  [key: string]: unknown;
}

export class BetsRepository {
  async create(betData: CreateBetData, transaction?: Transaction): Promise<Bet> {
    const bet = await BetModel.create(betData as any, { transaction });
    return this.mapToBet(bet);
  }

  async findById(betId: string): Promise<Bet | null> {
    const bet = await BetModel.findByPk(betId);
    if (!bet) return null;
    return this.mapToBet(bet);
  }

  async findByUserId(
    userId: string,
    options: {
      limit: number;
      offset: number;
      gameId?: string;
      status?: string;
    }
  ): Promise<{ bets: Bet[]; total: number }> {
    const where: WhereOptions = { userId };

    if (options.gameId) {
      where.gameId = options.gameId;
    }

    if (options.status) {
      where.status = options.status;
    }

    const { rows, count } = await BetModel.findAndCountAll({
      where,
      limit: options.limit,
      offset: options.offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      bets: rows.map(r => this.mapToBet(r)),
      total: count,
    };
  }

  async getStatistics(userId: string) {
    const bets = await BetModel.findAll({ where: { userId } });

    const totalBets = bets.length;
    const wonBets = bets.filter(b => b.status === BetStatus.WON).length;
    const lostBets = bets.filter(b => b.status === BetStatus.LOST).length;
    const totalWagered = bets.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalPayout = bets
      .filter(b => b.status === BetStatus.WON)
      .reduce((sum, b) => sum + Number(b.payout || 0), 0);
    const netProfit = totalPayout - totalWagered;
    const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;

    return {
      totalBets,
      wonBets,
      lostBets,
      totalWagered,
      totalPayout,
      netProfit,
      winRate: Math.round(winRate * 100) / 100,
    };
  }

  async countByUserId(userId: string): Promise<number> {
    return await BetModel.count({ where: { userId } });
  }

  async findRecentBets(userId: string, limit: number = 10): Promise<Bet[]> {
    const bets = await BetModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
    return bets.map(b => this.mapToBet(b));
  }

  private mapToBet(data: BetModel | Record<string, unknown>): Bet {
    // Convert Sequelize model to plain object if needed
    const plain = data instanceof BetModel ? data.get({ plain: true }) : data;

    return {
      id: plain.id as string,
      userId: (plain.userId || plain.user_id) as string,
      gameId: (plain.gameId || plain.game_id) as string,
      amount: parseFloat(String(plain.amount)),
      status: (plain.status as BetStatus),
      multiplier: plain.multiplier ? parseFloat(String(plain.multiplier)) : null,
      payout: plain.payout ? parseFloat(String(plain.payout)) : null,
      resultData: plain.resultData || plain.result_data || null,
      createdAt: new Date(plain.createdAt || plain.created_at),
      settledAt: plain.settledAt || plain.settled_at ? new Date(plain.settledAt || plain.settled_at) : null
    };
  }
}

export const betsRepository = new BetsRepository();
