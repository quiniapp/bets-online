import { useState, useEffect } from 'react';
import { apiService } from '@/services/api.service';
import type { User, CreateUserDto, UpdateUserDto, UserTreeNode } from 'helper';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get<{ users: User[] }>('/users/me/children');

      if (response.success && response.data) {
        setUsers(response.data.users);
      } else {
        setError(response.error?.message || 'Failed to load users');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: CreateUserDto) => {
    try {
      const response = await apiService.post<User>('/users', userData);

      if (response.success && response.data) {
        setUsers([...users, response.data]);
      }

      return response;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  };

  const updateUser = async (userId: string, userData: UpdateUserDto) => {
    try {
      const response = await apiService.patch<User>(`/users/${userId}`, userData);

      if (response.success && response.data) {
        setUsers(users.map(u => u.id === userId ? response.data! : u));
      }

      return response;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const blockUser = async (userId: string) => {
    try {
      const response = await apiService.post<User>(`/users/${userId}/block`);

      if (response.success && response.data) {
        setUsers(users.map(u => u.id === userId ? response.data! : u));
      }

      return response;
    } catch (error) {
      console.error('Failed to block user:', error);
      throw error;
    }
  };

  const unblockUser = async (userId: string) => {
    try {
      const response = await apiService.post<User>(`/users/${userId}/unblock`);

      if (response.success && response.data) {
        setUsers(users.map(u => u.id === userId ? response.data! : u));
      }

      return response;
    } catch (error) {
      console.error('Failed to unblock user:', error);
      throw error;
    }
  };

  const getUserTree = async () => {
    try {
      const response = await apiService.get<UserTreeNode>('/users/me/tree');
      return response;
    } catch (error) {
      console.error('Failed to load user tree:', error);
      throw error;
    }
  };

  const resetPassword = async (userId: string, newPassword: string) => {
    try {
      const response = await apiService.post(`/users/${userId}/reset-password`, {
        userId,
        newPassword,
      });

      return response;
    } catch (error) {
      console.error('Failed to reset password:', error);
      throw error;
    }
  };

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    blockUser,
    unblockUser,
    getUserTree,
    resetPassword,
    reload: loadUsers,
  };
}
