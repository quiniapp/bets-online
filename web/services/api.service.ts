import type { ApiResponse, User } from 'helper';

const SESSION_FLAG = 'session_active';

class ApiService {
  private baseUrl: string;
  private csrfToken: string | null = null;
  private isRefreshing = false;
  // Flag local (no sensible) para saber si hay sesión sin leer cookies httpOnly
  private sessionActive = false;

  constructor() {
    // Las llamadas van a /api/* y Next.js las proxifica al backend.
    // Funciona igual en desarrollo (rewrite a localhost:3001) y producción (Railway).
    this.baseUrl = '';
    if (typeof window !== 'undefined') {
      this.sessionActive = localStorage.getItem(SESSION_FLAG) === '1';
    }
  }

  setSessionActive(active: boolean) {
    this.sessionActive = active;
    if (typeof window !== 'undefined') {
      if (active) {
        localStorage.setItem(SESSION_FLAG, '1');
      } else {
        localStorage.removeItem(SESSION_FLAG);
      }
    }
  }

  hasSession(): boolean {
    return this.sessionActive;
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
    this.setSessionActive(false);
    if (typeof window !== 'undefined') {
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

    // Sin token de Authorization: la cookie session se envía automáticamente.
    // Solo agregar CSRF para mutaciones sin sesión activa.
    if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method) && !this.hasSession()) {
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
      const isAuthFailure =
        (response.status === 401 || response.status === 403) ||
        (!data.success && this.isAuthError(data.error?.code));

      if (isAuthFailure && this.hasSession() && !isRetry && !this.isRefreshing) {
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

      if (isAuthFailure && this.hasSession()) {
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

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
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
    const response = await this.post<{ user: User }>('/auth/login', { username, password });

    if (response.success && response.data) {
      this.setSessionActive(true);
    }

    return response;
  }

  async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        this.setSessionActive(true);
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
      this.setSessionActive(false);
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
