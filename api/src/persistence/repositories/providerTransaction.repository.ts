import { Transaction, Op } from 'sequelize';
import { ProviderTransactionModel } from '../models/ProviderTransaction.model';
import {
  ProviderTransaction,
  TransactionType,
  BetType,
  GameRoundStatus,
  BetOutcomeEventData
} from 'helper';

export class ProviderTransactionRepository {
  async findByIdempotencyKey(
    providerName: string,
    providerTransactionId: string,
    transactionType: TransactionType,
    transaction?: Transaction
  ): Promise<ProviderTransaction | null> {
    const tx = await ProviderTransactionModel.findOne({
      where: { providerName, providerTransactionId, transactionType },
      transaction
    });
    if (!tx) return null;
    return this.mapToProviderTransaction(tx);
  }

  async findOriginalForReversal(
    providerName: string,
    providerTransactionId: string,
    transaction?: Transaction
  ): Promise<ProviderTransaction | null> {
    const tx = await ProviderTransactionModel.findOne({
      where: {
        providerName,
        providerTransactionId,
        transactionType: { [Op.in]: [TransactionType.Debit, TransactionType.Credit] }
      },
      transaction
    });
    if (!tx) return null;
    return this.mapToProviderTransaction(tx);
  }

  async create(
    data: {
      providerName: string;
      providerTransactionId: string;
      providerGameRoundId?: string | null;
      providerGameId?: string | null;
      providerPlayerId: string;
      userId: string;
      transactionType: TransactionType;
      betType?: BetType | null;
      gameRoundStatus?: GameRoundStatus | null;
      amount: string;
      currency: string;
      balanceAfter: string;
      betOutcomeEventData?: BetOutcomeEventData | null;
    },
    transaction?: Transaction
  ): Promise<ProviderTransaction> {
    const tx = await ProviderTransactionModel.create(
      {
        providerName: data.providerName,
        providerTransactionId: data.providerTransactionId,
        providerGameRoundId: data.providerGameRoundId ?? null,
        providerGameId: data.providerGameId ?? null,
        providerPlayerId: data.providerPlayerId,
        userId: data.userId,
        transactionType: data.transactionType,
        betType: data.betType ?? null,
        gameRoundStatus: data.gameRoundStatus ?? null,
        amount: data.amount,
        currency: data.currency,
        balanceAfter: data.balanceAfter,
        betOutcomeEventData: data.betOutcomeEventData ?? null
      },
      { transaction }
    );
    return this.mapToProviderTransaction(tx);
  }

  private mapToProviderTransaction(model: ProviderTransactionModel): ProviderTransaction {
    const plain = model.get({ plain: true });
    return {
      id: plain.id,
      providerName: plain.providerName,
      providerTransactionId: plain.providerTransactionId,
      providerGameRoundId: plain.providerGameRoundId,
      providerGameId: plain.providerGameId,
      providerPlayerId: plain.providerPlayerId,
      userId: plain.userId,
      transactionType: plain.transactionType as TransactionType,
      betType: plain.betType as BetType | null,
      gameRoundStatus: plain.gameRoundStatus as GameRoundStatus | null,
      amount: String(plain.amount),
      currency: plain.currency,
      balanceAfter: String(plain.balanceAfter),
      betOutcomeEventData: plain.betOutcomeEventData,
      createdAt: new Date(plain.createdAt),
      updatedAt: new Date(plain.updatedAt)
    };
  }
}

export const providerTransactionRepository = new ProviderTransactionRepository();
