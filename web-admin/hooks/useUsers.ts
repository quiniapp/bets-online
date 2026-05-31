import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api.service';
import type { User, CreateUserDto, UpdateUserDto, UserTreeNode, PaginationMeta } from 'helper';

interface UseUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  autoLoad?: boolean;
  mode?: 'children' | 'descendants';
}

export function useUsers(options: UseUsersOptions = {}) {
  const { page = 1, limit = 10, search, autoLoad = true, mode = 'children' } = options;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const loadUsers = useCallback(async (params?: { page?: number; limit?: number; search?: string }) => {
    const queryPage = params?.page ?? page;
    const queryLimit = params?.limit ?? limit;
    const querySearch = params?.search ?? search;

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', String(queryPage));
      queryParams.append('limit', String(queryLimit));
      if (querySearch && querySearch.length >= 3) {
        queryParams.append('search', querySearch);
      }

      const endpoint = mode === 'descendants' ? '/users/me/descendants' : '/users/me/children';
      const response = await apiService.get<User[]>(`${endpoint}?${queryParams.toString()}`);

      if (response.success && response.data) {
        setUsers(response.data);
        if (response.meta) {
          setPagination(response.meta);
        }
      } else {
        setError(response.error?.message || 'Failed to load users');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, mode]);

  useEffect(() => {
    if (autoLoad) {
      loadUsers();
    }
  }, [loadUsers, autoLoad]);

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
    pagination,
    createUser,
    updateUser,
    blockUser,
    unblockUser,
    getUserTree,
    resetPassword,
    reload: loadUsers,
  };
}
