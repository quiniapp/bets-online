import type { ApiResponse, User, AuthTokens } from 'helper';

class ApiService {
  private baseUrl: string;
  private accessToken: string | null = null;
  private csrfToken: string | null = null;
  private isRefreshing = false;

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

  private async fetchCsrfToken(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/csrf-token`, { credentials: 'include' });
    const data = await res.json() as { success: boolean; token?: string };
    this.csrfToken = data.token ?? '';
    return this.csrfToken;
  }

  private isAuthError(code?: string): boolean {
    const authErrorCodes = [
      'UNAUTHORIZED',
      'TOKEN_EXPIRED',
      'INVALID_TOKEN',
      'SESSION_EXPIRED'
    ];
    return authErrorCodes.includes(code || '');
  }

  private handleAuthError(): void {
    // Limpiar todos los tokens
    this.setAccessToken(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_role');

      // Redirect inmediato a login usando window.location para garantizar limpieza completa
      window.location.href = '/login';
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
      // Sin token de auth, CSRF middleware activo — incluir x-csrf-token
      const csrf = this.csrfToken ?? await this.fetchCsrfToken();
      headers['x-csrf-token'] = csrf;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });

      const data: ApiResponse<T> = await response.json();

      // CSRF token inválido — limpiar caché y reintentar una sola vez
      if (!data.success && data.error?.code === 'CSRF_INVALID' && !isRetry) {
        this.csrfToken = null;
        return this.request<T>(endpoint, options, true);
      }

      // Detectar errores de autenticación (HTTP 401/403 o error en el body)
      // Si hay una sesión activa y no es un reintento, intentar refresh primero
      const isAuthFailure =
        (response.status === 401 || response.status === 403) ||
        (!data.success && this.isAuthError(data.error?.code));

      if (isAuthFailure && this.getAccessToken() && !isRetry && !this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.request<T>(endpoint, options, true);
          }
        } finally {
          this.isRefreshing = false;
        }
        this.handleAuthError();
        throw new Error('Session expired');
      }

      // Sin token activo o ya en reintento: logout inmediato si es error de auth
      if (isAuthFailure && this.getAccessToken()) {
        this.handleAuthError();
        throw new Error('Session expired');
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
