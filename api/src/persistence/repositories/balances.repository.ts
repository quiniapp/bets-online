import { supabase } from '../../config/database';
import { Balance } from 'helper';

export class BalancesRepository {
  async findByUserId(userId: string): Promise<Balance | null> {
    const { data, error } = await supabase
      .from('balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToBalance(data);
  }

  async findByUserIds(userIds: string[]): Promise<Balance[]> {
    const { data, error } = await supabase
      .from('balances')
      .select('*')
      .in('user_id', userIds);

    if (error) throw error;

    return data?.map(this.mapToBalance) || [];
  }

  async create(userId: string, initialBalance = 0): Promise<Balance> {
    const { data, error } = await supabase
      .from('balances')
      .insert({
        user_id: userId,
        chip_balance: initialBalance
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToBalance(data);
  }

  async updateBalance(userId: string, newBalance: number): Promise<Balance> {
    const { data, error } = await supabase
      .from('balances')
      .update({
        chip_balance: newBalance,
        last_updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return this.mapToBalance(data);
  }

  async incrementBalance(userId: string, amount: number): Promise<Balance> {
    const balance = await this.findByUserId(userId);
    if (!balance) {
      throw new Error('Balance not found');
    }

    const newBalance = balance.chipBalance + amount;

    if (newBalance < 0) {
      throw new Error('Insufficient balance');
    }

    return this.updateBalance(userId, newBalance);
  }

  async decrementBalance(userId: string, amount: number): Promise<Balance> {
    return this.incrementBalance(userId, -amount);
  }

  private mapToBalance(data: any): Balance {
    return {
      id: data.id,
      userId: data.user_id,
      chipBalance: parseFloat(data.chip_balance),
      lastUpdatedAt: new Date(data.last_updated_at)
    };
  }
}

export const balancesRepository = new BalancesRepository();
