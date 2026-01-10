import type { ApiResponse, User, AuthTokens } from 'helper';

class ApiService {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', token);
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
      }
    }
  }

  getAccessToken(): string | null {
    if (!this.accessToken && typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
        ...options,
        headers,
      });

      const data: ApiResponse<T> = await response.json();

      // Auto-refresh token on 401
      if (!data.success && data.error?.code === 'TOKEN_EXPIRED') {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry original request with new token
          return this.request<T>(endpoint, options);
        } else {
          // Refresh failed, logout
          this.logout();
          throw new Error('Session expired. Please login again.');
        }
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth methods
  async login(username: string, password: string) {
    const response = await this.post<{
      user: User;
      tokens: AuthTokens;
    }>('/auth/login', { username, password });

    if (response.success && response.data) {
      this.setAccessToken(response.data.tokens.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
      }
    }

    return response;
  }

  async refreshToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await this.post<AuthTokens>('/auth/refresh', {
        refreshToken,
      });

      if (response.success && response.data) {
        this.setAccessToken(response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_role');
      }
    }
  }

  async getCurrentUser() {
    return this.get<User>('/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    return this.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  }
}

export const apiService = new ApiService();
