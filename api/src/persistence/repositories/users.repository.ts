import { supabase } from '../../config/database';
import { User, CreateUserDto, UpdateUserDto, UserStatus } from 'helper';

export class UsersRepository {
  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToUser(data);
  }

  async findByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToUser(data);
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToUser(data);
  }

  async findByParentId(parentId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('parent_user_id', parentId);

    if (error) throw error;

    return data?.map(this.mapToUser) || [];
  }

  async create(userData: CreateUserDto & { passwordHash: string }): Promise<User> {
    const { password, ...rest } = userData as any;

    const { data, error } = await supabase
      .from('users')
      .insert({
        parent_user_id: rest.parentUserId || null,
        role: rest.role,
        username: rest.username,
        email: rest.email,
        password_hash: rest.passwordHash,
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (error) throw error;

    // Create initial balance
    await supabase.from('balances').insert({
      user_id: data.id,
      chip_balance: 0
    });

    return this.mapToUser(data);
  }

  async update(id: string, updateData: UpdateUserDto): Promise<User> {
    const updateFields: any = {};

    if (updateData.username) updateFields.username = updateData.username;
    if (updateData.email) updateFields.email = updateData.email;
    if (updateData.status) updateFields.status = updateData.status;

    const { data, error } = await supabase
      .from('users')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return this.mapToUser(data);
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', id);

    if (error) throw error;
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return this.mapToUser(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async findDescendants(userId: string): Promise<User[]> {
    // Recursive query to get all descendants
    const { data, error } = await supabase.rpc('get_user_descendants', {
      user_id: userId
    });

    if (error) {
      // If function doesn't exist, fall back to manual recursive approach
      return this.getDescendantsManually(userId);
    }

    return data?.map(this.mapToUser) || [];
  }

  private async getDescendantsManually(userId: string): Promise<User[]> {
    const descendants: User[] = [];
    const children = await this.findByParentId(userId);

    for (const child of children) {
      descendants.push(child);
      const grandChildren = await this.getDescendantsManually(child.id);
      descendants.push(...grandChildren);
    }

    return descendants;
  }

  private mapToUser(data: any): User {
    return {
      id: data.id,
      parentUserId: data.parent_user_id,
      role: data.role,
      username: data.username,
      email: data.email,
      passwordHash: data.password_hash,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

export const usersRepository = new UsersRepository();
