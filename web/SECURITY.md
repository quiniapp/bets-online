# Frontend Security Audit Report

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Vulnerabilities](#critical-vulnerabilities)
3. [High-Priority Issues](#high-priority-issues)
4. [Medium-Priority Issues](#medium-priority-issues)
5. [Low-Priority Issues](#low-priority-issues)
6. [Best Practices Recommendations](#best-practices-recommendations)
7. [Implementation Priority](#implementation-priority)

---

## Executive Summary

This security audit was conducted on the Next.js frontend application for the casino betting platform. The audit identified **8 critical**, **12 high-priority**, **9 medium-priority**, and **5 low-priority** security issues that require immediate attention.

**Risk Level**: 🔴 **HIGH**

**Immediate Actions Required**:
1. Implement CSRF protection
2. Add Content Security Policy headers
3. Secure localStorage token storage
4. Implement proper input sanitization
5. Add rate limiting on authentication
6. Remove console.log statements with sensitive data

---

## Critical Vulnerabilities

### 1. 🔴 Token Storage in localStorage (XSS Vulnerable)

**Location**: `web/services/api.service.ts:14-18`, `web/contexts/auth-context.tsx:65-66`

**Issue**:
```typescript
// VULNERABLE CODE
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
```

**Risk**:
- localStorage is accessible by any JavaScript code running on the page
- XSS attacks can steal authentication tokens
- No protection against malicious scripts

**Impact**: **CRITICAL** - Complete account takeover possible

**Recommendation**:
```typescript
// SECURE ALTERNATIVE
// 1. Use httpOnly cookies (configured from API)
// 2. Store in memory for single-page sessions
// 3. Use secure session storage with encryption

// Option 1: Memory-only storage (most secure)
class SecureTokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    // DO NOT use localStorage
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clear() {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

// Option 2: Encrypted storage (if persistence needed)
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY!;

function setSecureItem(key: string, value: string) {
  const encrypted = CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
  sessionStorage.setItem(key, encrypted); // Use sessionStorage, not localStorage
}

function getSecureItem(key: string): string | null {
  const encrypted = sessionStorage.getItem(key);
  if (!encrypted) return null;

  const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return decrypted.toString(CryptoJS.enc.Utf8);
}
```

---

### 2. 🔴 No CSRF Protection

**Location**: All API calls in `web/services/api.service.ts`

**Issue**:
- No CSRF tokens in requests
- Vulnerable to Cross-Site Request Forgery attacks

**Risk**: Attackers can perform actions on behalf of authenticated users

**Recommendation**:
```typescript
// Add CSRF token to all requests
private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': await this.getCsrfToken(), // Add this
    ...options.headers,
  };

  // ... rest of the code
}

private async getCsrfToken(): Promise<string> {
  // Get CSRF token from meta tag or API endpoint
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  return metaTag?.getAttribute('content') || '';
}
```

```typescript
// Add to layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="csrf-token" content="{SERVER_GENERATED_TOKEN}" />
        {/* ... */}
      </head>
      {/* ... */}
    </html>
  )
}
```

---

### 3. 🔴 Missing Content Security Policy (CSP)

**Location**: `web/app/layout.tsx`

**Issue**: No CSP headers defined, allowing any scripts to run

**Risk**:
- XSS attacks can inject and execute malicious scripts
- Data exfiltration possible
- Clickjacking attacks

**Recommendation**:
Create `web/middleware.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set(
    'Content-Security-Policy',
    cspHeader.replace(/\s{2,}/g, ' ').trim()
  );

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set(
    'Content-Security-Policy',
    cspHeader.replace(/\s{2,}/g, ' ').trim()
  );

  return response;
}
```

---

### 4. 🔴 Sensitive Data in Console Logs

**Location**: Multiple files

**Issues**:
```typescript
// web/app/admin/dashboard/page.tsx:36-45
console.log("🏠 AdminDashboard - Current state:", {
  user: user?.username,
  role,
  isLoading,
  Role_admin: Role.admin,
  Role_superadmin: Role.superadmin,
  comparison1: role !== Role.admin,
  comparison2: role !== Role.superadmin,
  shouldRedirect: role !== Role.admin && role !== Role.superadmin
});

// web/contexts/auth-context.tsx
console.error('Failed to load user:', error)
console.error('Login failed:', error)
```

**Risk**:
- Sensitive information visible in production console
- Helps attackers understand app structure
- May leak user data

**Recommendation**:
```typescript
// Create a logger utility
// web/utils/logger.ts
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) console.log(...args);
  },
  error: (...args: any[]) => {
    if (isDevelopment) console.error(...args);
    // In production, send to error tracking service (e.g., Sentry)
  },
  warn: (...args: any[]) => {
    if (isDevelopment) console.warn(...args);
  }
};

// Usage
import { logger } from '@/utils/logger';

logger.log("AdminDashboard - Current state:", { role });
```

---

### 5. 🔴 No Input Sanitization

**Location**: All form inputs

**Issue**: User input is not sanitized before display or API submission

**Risk**:
- XSS attacks through form inputs
- SQL injection (if backend doesn't sanitize)
- HTML injection

**Recommendation**:
```typescript
// Install DOMPurify
// pnpm install dompurify @types/dompurify

// Create sanitizer utility
// web/utils/sanitizer.ts
import DOMPurify from 'dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags
    ALLOWED_ATTR: []
  });
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
    ALLOWED_ATTR: ['href']
  });
}

// Usage in forms
import { sanitizeInput } from '@/utils/sanitizer';

const onSubmit = async (data: LoginFormData) => {
  const sanitizedData = {
    username: sanitizeInput(data.email),
    password: data.password // Don't sanitize passwords, just validate
  };

  const success = await login(sanitizedData);
  // ...
};
```

---

### 6. 🔴 Missing Rate Limiting on Authentication

**Location**: `web/feature/login/hook/useLogin.ts`

**Issue**: No rate limiting on login attempts

**Risk**:
- Brute force attacks
- Credential stuffing
- Account enumeration

**Recommendation**:
```typescript
// Create rate limiter hook
// web/hooks/useRateLimit.ts
import { useState, useEffect } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

export function useRateLimit(key: string, config: RateLimitConfig) {
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`rateLimit_${key}`);
    if (stored) {
      const data = JSON.parse(stored);
      if (Date.now() < data.blockedUntil) {
        setBlockedUntil(data.blockedUntil);
      }
    }
  }, [key]);

  const recordAttempt = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (newAttempts >= config.maxAttempts) {
      const until = Date.now() + config.blockDurationMs;
      setBlockedUntil(until);
      localStorage.setItem(`rateLimit_${key}`, JSON.stringify({
        blockedUntil: until
      }));
    }
  };

  const reset = () => {
    setAttempts(0);
    setBlockedUntil(null);
    localStorage.removeItem(`rateLimit_${key}`);
  };

  const isBlocked = blockedUntil !== null && Date.now() < blockedUntil;
  const remainingTime = blockedUntil ? Math.ceil((blockedUntil - Date.now()) / 1000) : 0;

  return { recordAttempt, reset, isBlocked, remainingTime, attempts };
}

// Usage in login
const useLogin = () => {
  const rateLimit = useRateLimit('login', {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000
  });

  const onSubmit = async (data: LoginFormData) => {
    if (rateLimit.isBlocked) {
      setError(`Too many attempts. Try again in ${rateLimit.remainingTime} seconds.`);
      return;
    }

    try {
      const success = await login({ username: data.email, password: data.password });

      if (success) {
        rateLimit.reset();
        // redirect...
      } else {
        rateLimit.recordAttempt();
        setError("Invalid credentials");
      }
    } catch (error: any) {
      rateLimit.recordAttempt();
      setError(error?.message || "Login failed");
    }
  };

  return { /* ... */, isBlocked: rateLimit.isBlocked, remainingTime: rateLimit.remainingTime };
};
```

---

### 7. 🔴 No Input Validation on Client Side

**Location**: All form components

**Issue**: Weak validation rules, especially for password

**Risk**:
- Weak passwords accepted
- Invalid data sent to API
- Poor UX

**Current Validation**:
```typescript
// web/feature/login/hook/useLogin.ts:79-89
const validationRules = {
  email: {
    required: "El usuario es requerido",
  },
  password: {
    required: "La contraseña es requerida",
    minLength: {
      value: 8, // Too weak!
      message: "La contraseña debe tener al menos 8 caracteres"
    }
  }
};
```

**Recommendation**:
```typescript
// Create validation schemas with Zod
// web/utils/validation.ts
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must not exceed 50 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores');

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase();

// Usage with react-hook-form
import { zodResolver } from '@hookform/resolvers/zod';

const loginFormSchema = z.object({
  email: usernameSchema.or(emailSchema),
  password: z.string().min(8) // Basic check for login, strict for registration
});

const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
  resolver: zodResolver(loginFormSchema),
  mode: "onChange"
});
```

---

### 8. 🔴 Exposed API URLs in Client Code

**Location**: `web/.env.local`, `web/config/index.ts`

**Issue**: API URLs hardcoded in environment variables accessible to client

**Risk**:
- API endpoint discovery
- Environment exposure
- Configuration leakage

**Current Code**:
```typescript
// web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001 // EXPOSED to client!
```

**Recommendation**:
```typescript
// Use Next.js API routes as proxy
// web/app/api/[...proxy]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL; // NOT exposed to client

export async function POST(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  const path = params.proxy.join('/');
  const body = await request.json();

  try {
    const response = await fetch(`${API_URL}/api/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth headers
        'Authorization': request.headers.get('Authorization') || ''
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Proxy error' },
      { status: 500 }
    );
  }
}

// Update api.service.ts
class ApiService {
  private baseUrl = '/api'; // Use Next.js API routes

  private async request<T>(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, options);
    // ... rest of code
  }
}
```

---

## High-Priority Issues

### 9. 🟠 Missing Security Headers

**Location**: `web/app/layout.tsx`

**Missing Headers**:
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

**Recommendation**:
```typescript
// web/next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ]
      }
    ];
  }
};
```

---

### 10. 🟠 No Session Timeout

**Location**: `web/contexts/auth-context.tsx`

**Issue**: Sessions never expire on client side

**Recommendation**:
```typescript
// Add session timeout
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [lastActivity, setLastActivity] = useState(Date.now());
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    const checkTimeout = setInterval(() => {
      if (Date.now() - lastActivity > SESSION_TIMEOUT) {
        logout();
      }
    }, 60000); // Check every minute

    // Track user activity
    const handleActivity = () => setLastActivity(Date.now());
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);

    return () => {
      clearInterval(checkTimeout);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
    };
  }, [lastActivity]);

  // ... rest of code
}
```

---

### 11. 🟠 Weak Password Visibility Toggle

**Location**: `web/feature/login/components/login-form.tsx:24-28`

**Issue**: Password visibility controlled by client state only

**Recommendation**:
```typescript
// Add security notice
const [showPassword, setShowPassword] = useState(false);
const [showWarning, setShowWarning] = useState(false);

const handleShowPassword = () => {
  if (!showPassword) {
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 3000);
  }
  setShowPassword(!showPassword);
};

// In JSX
{showWarning && (
  <Alert variant="warning">
    <AlertDescription>
      Make sure no one is watching your screen
    </AlertDescription>
  </Alert>
)}
```

---

### 12. 🟠 No Error Boundary

**Location**: All pages

**Issue**: Unhandled errors can crash the entire app and expose stack traces

**Recommendation**:
```typescript
// web/components/error-boundary.tsx
'use client';

import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    console.error('ErrorBoundary caught:', error, errorInfo);
    // In production, send to Sentry or similar
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">We're sorry, but something unexpected happened.</p>
            {process.env.NODE_ENV === 'development' && (
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {this.state.error?.message}
              </pre>
            )}
            <Button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Wrap in layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

---

### 13. 🟠 Unprotected Routes

**Location**: All pages under `/admin/`, `/user/`, `/cashier/`

**Issue**: No middleware to protect routes, only client-side checks

**Recommendation**:
```typescript
// web/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/', '/api/auth/login'];
const ADMIN_PATHS = ['/admin'];
const USER_PATHS = ['/user'];
const CASHIER_PATHS = ['/cashier'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get('accessToken')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Decode and verify token (simplified - use proper JWT verification)
  try {
    // const decoded = verifyJWT(token);
    // Check role and path permissions
    // if (isAdmin && pathname.startsWith('/admin')) return NextResponse.next();
    // if (isUser && pathname.startsWith('/user')) return NextResponse.next();
    // etc.
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
```

---

### 14. 🟠 Mock Data Still Present in Production Build

**Location**: `web/lib/mock-data.ts`

**Issue**: Mock authentication and data still accessible

**Recommendation**:
```typescript
// Remove or gate behind environment check
if (process.env.NODE_ENV === 'production') {
  throw new Error('Mock data should not be used in production');
}

export const authenticateUser = (username: string, password: string): User | null => {
  // ...
}
```

---

### 15. 🟠 Missing Input Length Limits

**Location**: All input fields

**Issue**: No maxLength attributes on inputs

**Recommendation**:
```typescript
<Input
  id="email"
  type="text"
  placeholder="usuario@mail.com"
  maxLength={100} // Add this
  {...register("email", validationRules.email)}
/>

<Input
  id="password"
  type="password"
  maxLength={128} // Add this
  {...register("password", validationRules.password)}
/>
```

---

### 16. 🟠 No Secure Context Enforcement

**Location**: Root application

**Issue**: App works over HTTP in production

**Recommendation**:
```typescript
// web/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
      window.location.href = window.location.href.replace('http:', 'https:');
    }
  }, []);

  return (/* ... */);
}
```

---

### 17. 🟠 Insufficient Logout Implementation

**Location**: `web/contexts/auth-context.tsx:80-87`

**Issue**: Logout doesn't revoke tokens on server, just clears client

**Recommendation**:
```typescript
const logout = async () => {
  try {
    // 1. Call API to revoke tokens
    await apiService.logout();

    // 2. Clear all client storage
    apiService.setAccessToken(null);
    localStorage.clear();
    sessionStorage.clear();

    // 3. Clear cookies
    document.cookie.split(";").forEach(c => {
      document.cookie = c.replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // 4. Reset state
    setUser(null);
    setRole(null);

    // 5. Redirect
    router.push(ROUTER.LOGIN);
  } catch (error) {
    console.error('Logout error:', error);
    // Force logout even if API call fails
    window.location.href = ROUTER.LOGIN;
  }
};
```

---

### 18. 🟠 Predictable Session IDs

**Location**: Token generation

**Issue**: If using client-generated session IDs, they may be predictable

**Recommendation**: Always generate session IDs on the server with cryptographically secure random functions.

---

### 19. 🟠 Missing Subresource Integrity (SRI)

**Location**: External scripts/styles

**Issue**: No SRI hashes for external resources

**Recommendation**:
```typescript
// If using external CDN resources
<link
  rel="stylesheet"
  href="https://cdn.example.com/style.css"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossOrigin="anonymous"
/>
```

---

### 20. 🟠 No Click jacking Protection

**Issue**: Missing X-Frame-Options or frame-ancestors CSP

**Recommendation**: Already covered in issue #9 (Security Headers)

---

## Medium-Priority Issues

### 21. 🟡 Verbose Error Messages

**Location**: Multiple locations

**Issue**: Error messages reveal too much information

**Current**:
```typescript
setError(error?.message || "Error al iniciar sesión");
```

**Recommendation**:
```typescript
// Generic error messages for users
const getPublicErrorMessage = (error: Error): string => {
  // Log the real error server-side
  logError(error);

  // Return generic message to user
  return "An error occurred. Please try again or contact support.";
};

setError(getPublicErrorMessage(error));
```

---

### 22. 🟡 Missing Autocomplete Attributes

**Location**: Login form inputs

**Recommendation**:
```typescript
<Input
  id="email"
  type="text"
  placeholder="usuario@mail.com"
  autoComplete="username" // Add this
  {...register("email")}
/>

<Input
  id="password"
  type="password"
  autoComplete="current-password" // Add this
  {...register("password")}
/>
```

---

### 23. 🟡 No Clickjacking Protection for Modals

**Issue**: Modals/dialogs can be overlayed

**Recommendation**: Use frame-busting scripts or X-Frame-Options (already recommended)

---

### 24. 🟡 Missing Anti-Automation

**Issue**: No CAPTCHA on forms

**Recommendation**:
```typescript
// Install reCAPTCHA
// pnpm install react-google-recaptcha

import ReCAPTCHA from 'react-google-recaptcha';

const LoginForm = () => {
  const [captchaValue, setCaptchaValue] = useState<string | null>(null);

  const onSubmit = async (data: LoginFormData) => {
    if (!captchaValue) {
      setError('Please complete the CAPTCHA');
      return;
    }

    // Include captcha in API request
    const success = await login({
      ...data,
      captcha: captchaValue
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
      <ReCAPTCHA
        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
        onChange={setCaptchaValue}
      />
      {/* ... */}
    </form>
  );
};
```

---

### 25. 🟡 Missing Audit Logging

**Location**: All critical actions

**Issue**: No client-side audit trail

**Recommendation**:
```typescript
// Create audit logger
// web/utils/audit.ts
interface AuditEvent {
  action: string;
  userId?: string;
  timestamp: Date;
  details?: any;
}

export function logAudit(event: AuditEvent) {
  // Send to API for server-side logging
  fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  }).catch(console.error);
}

// Usage
const login = async (credentials) => {
  const response = await apiService.login(credentials.username, credentials.password);

  if (response.success) {
    logAudit({
      action: 'LOGIN_SUCCESS',
      userId: response.data.user.id,
      timestamp: new Date()
    });
  } else {
    logAudit({
      action: 'LOGIN_FAILED',
      timestamp: new Date(),
      details: { username: credentials.username }
    });
  }

  return response.success;
};
```

---

### 26. 🟡 No Dependencies Security Scanning

**Issue**: No automated dependency vulnerability scanning

**Recommendation**:
```bash
# Add to package.json scripts
"scripts": {
  "audit": "pnpm audit --audit-level=moderate",
  "audit:fix": "pnpm audit --fix"
}

# Set up GitHub Dependabot
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/web"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

---

### 27. 🟡 Insufficient Password Reset Flow

**Location**: Login form mentions "recuperar contraseña" but not implemented

**Recommendation**: Implement secure password reset with:
- Time-limited tokens
- Email verification
- Single-use tokens
- Rate limiting

---

### 28. 🟡 Missing Security.txt

**Issue**: No security contact information

**Recommendation**:
```
# web/public/.well-known/security.txt
Contact: security@yourdomain.com
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: en, es
```

---

### 29. 🟡 No Integrity Checks on User Data

**Issue**: User data from localStorage not validated

**Recommendation**:
```typescript
const loadUser = async () => {
  const savedUser = localStorage.getItem("auth_user");
  if (savedUser) {
    try {
      const parsedUser = JSON.parse(savedUser);

      // Validate structure
      if (!parsedUser.id || !parsedUser.role || !parsedUser.username) {
        throw new Error('Invalid user data');
      }

      // Verify with server
      const response = await apiService.getCurrentUser();
      if (response.success) {
        setUser(response.data);
      }
    } catch (error) {
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_role");
    }
  }
};
```

---

## Low-Priority Issues

### 30. ⚪ Missing Favicon Security

**Issue**: No security-related meta tags in favicon

**Recommendation**: Ensure favicon.ico is not cached indefinitely and doesn't leak information

---

### 31. ⚪ Browser Compatibility Warnings

**Issue**: No warnings for unsupported browsers

**Recommendation**:
```typescript
// Check for required features
useEffect(() => {
  if (!window.crypto || !window.crypto.subtle) {
    alert('Your browser is not supported. Please upgrade to a modern browser.');
  }
}, []);
```

---

### 32. ⚪ Missing CSP Report URI

**Issue**: CSP violations not reported

**Recommendation**: Add report-uri to CSP header to track violations

---

### 33. ⚪ No Security Linter

**Recommendation**:
```bash
# Install ESLint security plugins
pnpm add -D eslint-plugin-security eslint-plugin-no-secrets

# .eslintrc.js
module.exports = {
  plugins: ['security', 'no-secrets'],
  extends: ['plugin:security/recommended'],
  rules: {
    'no-secrets/no-secrets': 'error',
    'security/detect-object-injection': 'warn'
  }
};
```

---

### 34. ⚪ Missing Telemetry Privacy

**Issue**: No privacy policy for telemetry/analytics

**Recommendation**: Add cookie consent and privacy policy if collecting data

---

## Best Practices Recommendations

### 1. Implement Security Headers Package

```bash
pnpm add next-secure-headers
```

```typescript
// next.config.js
const { createSecureHeaders } = require("next-secure-headers");

module.exports = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: createSecureHeaders({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: "'self'",
            styleSrc: ["'self'", "'unsafe-inline'"],
          },
        },
        forceHTTPSRedirect: [true, { maxAge: 60 * 60 * 24 * 4, includeSubDomains: true }],
        referrerPolicy: "same-origin",
      }),
    }];
  },
};
```

---

### 2. Implement Secure Cookie Settings

```typescript
// If using cookies for auth (recommended)
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/'
};
```

---

### 3. Add Security Testing

```bash
# Add security testing dependencies
pnpm add -D @testing-library/react @testing-library/jest-dom jest-axe

# Create security tests
# web/tests/security/xss.test.tsx
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('XSS Protection', () => {
  it('should sanitize user input', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    // Test that input is sanitized
  });

  it('should pass accessibility audit', async () => {
    const { container } = render(<LoginForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

---

### 4. Regular Security Audits

Schedule:
- Weekly: Automated dependency scanning
- Monthly: Manual code review
- Quarterly: Third-party penetration testing
- Annually: Full security audit

---

## Implementation Priority

### Phase 1 (Immediate - Week 1)
1. ✅ Remove console.log with sensitive data
2. ✅ Add security headers
3. ✅ Implement CSP
4. ✅ Add rate limiting to login
5. ✅ Implement input sanitization

### Phase 2 (Critical - Week 2-3)
1. ✅ Migrate from localStorage to secure storage
2. ✅ Add CSRF protection
3. ✅ Implement proper input validation
4. ✅ Add route protection middleware
5. ✅ Implement Error Boundary

### Phase 3 (High Priority - Week 4-6)
1. ✅ Add session timeout
2. ✅ Implement audit logging
3. ✅ Add CAPTCHA to forms
4. ✅ Remove mock data from production
5. ✅ Strengthen logout implementation

### Phase 4 (Medium Priority - Week 7-8)
1. ✅ Improve error messages
2. ✅ Add autocomplete attributes
3. ✅ Implement password reset flow
4. ✅ Add security.txt
5. ✅ Set up dependency scanning

### Phase 5 (Ongoing)
1. ✅ Regular security audits
2. ✅ Penetration testing
3. ✅ Security training for team
4. ✅ Incident response planning

---

## Conclusion

The frontend application has **significant security vulnerabilities** that must be addressed before production deployment. The most critical issues involve token storage, lack of CSRF protection, missing CSP headers, and sensitive data exposure.

**Estimated Effort**: 3-4 weeks of dedicated security hardening

**Risk if Not Addressed**: High probability of account compromise, data breach, and XSS attacks.

**Next Steps**:
1. Review this document with the development team
2. Create Jira/GitHub issues for each vulnerability
3. Prioritize based on the implementation phases
4. Assign resources for remediation
5. Set up continuous security monitoring

---

**Report Generated**: 2025-11-30
**Reviewed By**: Security Audit Team
**Next Review**: 2026-02-28
