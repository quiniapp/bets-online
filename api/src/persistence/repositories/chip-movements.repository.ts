import { supabase } from '../../config/database';
import { ChipMovement, CreateChipMovementDto, ChipMovementType } from 'helper';

export class ChipMovementsRepository {
  async create(movementData: CreateChipMovementDto & {
    previousBalance: number;
    newBalance: number;
  }): Promise<ChipMovement> {
    const { data, error } = await supabase
      .from('chip_movements')
      .insert({
        user_id: movementData.userId,
        related_user_id: movementData.relatedUserId || null,
        type: movementData.type,
        amount: movementData.amount,
        description: movementData.description || null,
        previous_balance: movementData.previousBalance,
        new_balance: movementData.newBalance
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToMovement(data);
  }

  async findById(id: string): Promise<ChipMovement | null> {
    const { data, error } = await supabase
      .from('chip_movements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToMovement(data);
  }

  async findByUserId(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      type?: ChipMovementType;
    }
  ): Promise<{ movements: ChipMovement[]; total: number }> {
    let query = supabase
      .from('chip_movements')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      movements: data?.map(this.mapToMovement) || [],
      total: count || 0
    };
  }

  async findByRelatedUserId(
    relatedUserId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      type?: ChipMovementType;
    }
  ): Promise<{ movements: ChipMovement[]; total: number }> {
    let query = supabase
      .from('chip_movements')
      .select('*', { count: 'exact' })
      .eq('related_user_id', relatedUserId)
      .order('created_at', { ascending: false });

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      movements: data?.map(this.mapToMovement) || [],
      total: count || 0
    };
  }

  async getSalesSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ totalSales: number; totalPrizes: number }> {
    // Get total sales
    const { data: salesData } = await supabase
      .from('chip_movements')
      .select('amount')
      .eq('related_user_id', userId)
      .eq('type', ChipMovementType.SELL_TO_PLAYER)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get total prizes
    const { data: prizesData } = await supabase
      .from('chip_movements')
      .select('amount')
      .eq('related_user_id', userId)
      .eq('type', ChipMovementType.PRIZE)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const totalSales = salesData?.reduce((sum, m) => sum + parseFloat(m.amount), 0) || 0;
    const totalPrizes = prizesData?.reduce((sum, m) => sum + parseFloat(m.amount), 0) || 0;

    return { totalSales, totalPrizes };
  }

  private mapToMovement(data: any): ChipMovement {
    return {
      id: data.id,
      userId: data.user_id,
      relatedUserId: data.related_user_id,
      type: data.type,
      amount: parseFloat(data.amount),
      description: data.description,
      previousBalance: parseFloat(data.previous_balance),
      newBalance: parseFloat(data.new_balance),
      createdAt: new Date(data.created_at)
    };
  }
}

export const chipMovementsRepository = new ChipMovementsRepository();
