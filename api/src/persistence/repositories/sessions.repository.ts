import { supabase } from '../../config/database';
import { Session } from 'helper';

export class SessionsRepository {
  async create(
    userId: string,
    token: string,
    refreshToken: string,
    expiresAt: Date
  ): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        token,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToSession(data);
  }

  async findByToken(token: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('token', token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToSession(data);
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToSession(data);
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('expires_at', new Date().toISOString());

    if (error) throw error;

    return data?.map(this.mapToSession) || [];
  }

  async deleteByToken(token: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('token', token);

    if (error) throw error;
  }

  async deleteByUserId(userId: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  async deleteExpired(): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
  }

  private mapToSession(data: any): Session {
    return {
      id: data.id,
      userId: data.user_id,
      token: data.token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at)
    };
  }
}

export const sessionsRepository = new SessionsRepository();
