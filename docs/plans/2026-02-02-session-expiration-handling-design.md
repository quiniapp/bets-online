# Manejo Automático de Sesiones Expiradas

**Fecha:** 2026-02-02
**Tipo:** Mejora de Seguridad y UX
**Componentes afectados:** AuthContext, ApiService

## Resumen

Implementar detección y manejo automático de sesiones expiradas para mejorar la seguridad y experiencia de usuario. Cuando una sesión expire (por inactividad o token inválido), redirigir automáticamente al login sin mensajes molestos.

## Problema Actual

**Escenario**:
1. Usuario inicia sesión y navega por la aplicación
2. Deja la sesión abierta (ej: cierra laptop sin logout)
3. Al día siguiente regresa a la misma página
4. La sesión ya expiró en el servidor
5. La UI sigue mostrando contenido pero los requests fallan
6. Usuario tiene que hacer logout manual o cerrar/abrir browser

**Problemas**:
- Confusión del usuario (¿por qué no funciona nada?)
- Potencial pérdida de datos en formularios
- Mala experiencia de usuario
- Riesgo de seguridad (sesión abierta sin validar)

## Solución Propuesta

### Estrategia Multi-Capa

**1. Interceptor de API (401/403)**
- Detectar respuestas de autenticación fallida del servidor
- Limpiar tokens y redirigir automáticamente
- Intentar refresh token primero si es posible

**2. Validación en AuthContext al Cargar**
- Si `loadUser()` falla al montar la app, redirigir a login
- Cubre el caso: "volví después de horas/días"

**3. Inactivity Timer (30 minutos)**
- Rastrear actividad del usuario (mouse, teclado, scroll, touch)
- Auto-logout después de 30 minutos sin actividad
- Reset del timer con cualquier interacción

**4. Sincronización Multi-Tab**
- Si usuario cierra sesión en una tab, cerrar en todas
- Usar `storage` event listener

## Implementación Técnica

### 1. API Service - Interceptor de Autenticación

**Archivo:** `web/services/api.service.ts`

**Cambios**:

```typescript
private async request<T>(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
      ...options,
      headers
    });

    // Detectar respuestas HTTP de autenticación fallida
    if (response.status === 401 || response.status === 403) {
      this.handleAuthError();
      throw new Error('Session expired');
    }

    const data: ApiResponse<T> = await response.json();

    // Detectar errores de auth en el body
    if (!data.success && this.isAuthError(data.error?.code)) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        this.handleAuthError();
        throw new Error('Session expired');
      }
      return this.request<T>(endpoint, options); // Retry con nuevo token
    }

    return data;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
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

    // Redirect inmediato a login
    window.location.href = '/admin/login';
  }
}
```

**Razón del cambio:**
- Centraliza el manejo de errores de autenticación
- Evita código duplicado en cada componente
- Garantiza que CUALQUIER request con sesión inválida redirige

### 2. Auth Context - Validación al Cargar y Timer de Inactividad

**Archivo:** `web/contexts/auth-context.tsx`

**Cambios**:

**A. Mejorar loadUser():**

```typescript
const loadUser = async () => {
  if (typeof window === 'undefined') {
    setIsLoading(false);
    return;
  }

  // No validar si estamos en login
  if (window.location.pathname === ROUTER.LOGIN) {
    setIsLoading(false);
    return;
  }

  setIsLoading(true);
  try {
    const token = apiService.getAccessToken();

    if (!token) {
      // No hay token, redirigir a login
      router.push(ROUTER.LOGIN);
      return;
    }

    const response = await apiService.getCurrentUser();

    if (response.success && response.data) {
      setUser(response.data);
      setRole(response.data.role);
    } else {
      // Token inválido o expirado
      apiService.setAccessToken(null);
      router.push(ROUTER.LOGIN);
    }
  } catch (error) {
    console.error('Failed to load user:', error);
    apiService.setAccessToken(null);
    router.push(ROUTER.LOGIN);
  } finally {
    setIsLoading(false);
  }
}
```

**B. Agregar Inactivity Timer:**

```typescript
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos en ms

useEffect(() => {
  // Solo activar si hay usuario logueado
  if (!user) return;

  // No activar en página de login
  if (typeof window !== 'undefined' && window.location.pathname === ROUTER.LOGIN) {
    return;
  }

  let inactivityTimer: NodeJS.Timeout;

  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      console.log('Session expired due to inactivity');
      logout();
    }, INACTIVITY_TIMEOUT);
  };

  // Eventos que indican actividad del usuario
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

  activityEvents.forEach(event => {
    window.addEventListener(event, resetTimer, { passive: true });
  });

  // Iniciar el timer
  resetTimer();

  // Cleanup
  return () => {
    clearTimeout(inactivityTimer);
    activityEvents.forEach(event => {
      window.removeEventListener(event, resetTimer);
    });
  };
}, [user, logout]);
```

**C. Agregar Sincronización Multi-Tab:**

```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;

  const handleStorageChange = (e: StorageEvent) => {
    // Si el token se eliminó en otra tab
    if (e.key === 'accessToken' && !e.newValue) {
      console.log('Session closed in another tab');
      setUser(null);
      setRole(null);
      router.push(ROUTER.LOGIN);
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}, [router]);
```

### 3. Mejoras Opcionales (Implementación Futura)

#### A. Warning antes de Expirar (5 minutos antes)

**Archivo:** `web/contexts/auth-context.tsx` (agregar al inactivity timer)

```typescript
const WARNING_BEFORE_EXPIRY = 5 * 60 * 1000; // 5 minutos
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos

const resetTimer = () => {
  clearTimeout(inactivityTimer);
  clearTimeout(warningTimer);

  // Warning 5 minutos antes
  warningTimer = setTimeout(() => {
    toast({
      title: "Sesión por expirar",
      description: "Tu sesión expirará en 5 minutos por inactividad. Mueve el mouse para mantenerla activa.",
      duration: 10000
    });
  }, INACTIVITY_TIMEOUT - WARNING_BEFORE_EXPIRY);

  // Logout después de 30 minutos
  inactivityTimer = setTimeout(() => {
    logout();
  }, INACTIVITY_TIMEOUT);
};
```

**Beneficios:**
- Usuario tiene oportunidad de prevenir logout
- Transparencia sobre lo que está pasando
- Reduce frustración

**Trade-offs:**
- Más código
- Requiere componente de toast
- Puede ser molesto si el usuario está trabajando en otra ventana

#### B. Persistir Ruta para Redirect Post-Login

**Archivo:** `web/services/api.service.ts`

```typescript
private handleAuthError(): void {
  if (typeof window !== 'undefined') {
    // Guardar ruta actual (excepto si ya está en login)
    const currentPath = window.location.pathname;
    if (currentPath !== '/admin/login') {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }

    this.setAccessToken(null);
    localStorage.removeItem('refreshToken');
    window.location.href = '/admin/login';
  }
}
```

**Archivo:** `web/app/admin/login/page.tsx` (después de login exitoso)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // ... código de login ...

  if (loggedInUser) {
    // Redirigir a ruta guardada o dashboard
    const redirectTo = localStorage.getItem('redirectAfterLogin') || getDashboardRoute(loggedInUser.role);
    localStorage.removeItem('redirectAfterLogin');
    router.push(redirectTo);
  }
};
```

**Beneficios:**
- Mejor UX: usuario vuelve a donde estaba
- Útil para deep links
- Reduce clicks necesarios

**Trade-offs:**
- Puede ser confuso si el usuario no recuerda dónde estaba
- Riesgo si la ruta guardada ya no es válida

#### C. Diferentes Timeouts por Rol

**Archivo:** `web/contexts/auth-context.tsx`

```typescript
const getInactivityTimeout = (userRole: UserRole | null): number => {
  switch (userRole) {
    case UserRole.ADMIN:
    case UserRole.OWNER:
      return 60 * 60 * 1000; // 60 minutos para admins
    case UserRole.CASHIER:
      return 30 * 60 * 1000; // 30 minutos para cajeros
    case UserRole.PLAYER:
      return 30 * 60 * 1000; // 30 minutos para jugadores
    default:
      return 30 * 60 * 1000; // 30 minutos por defecto
  }
};

const inactivityTimeout = getInactivityTimeout(role);

// Usar en el useEffect del timer
setTimeout(() => logout(), inactivityTimeout);
```

**Beneficios:**
- Más flexible para diferentes necesidades
- Admins pueden trabajar más tiempo sin interrupciones
- Cajeros tienen sesiones más seguras (manejo de dinero)

**Trade-offs:**
- Más complejidad
- Necesita documentación clara de los timeouts
- Puede ser inconsistente si no se comunica bien

## Edge Cases Manejados

### 1. Usuario en Múltiples Tabs

**Problema:** Si cierra sesión en una tab, las otras siguen "autenticadas"

**Solución:** Storage event listener sincroniza logout entre tabs

**Flujo:**
```
Tab A: logout() → localStorage.removeItem('accessToken') →
Tab B: storage event → detecta accessToken=null →
Tab B: setUser(null) + redirect a login
```

### 2. Refresh en Medio de Operación

**Problema:** Token expira mientras usuario llena formulario

**Solución:**
1. Interceptor intenta refresh automático primero
2. Solo si falla, redirige
3. Evita perder datos innecesariamente

**Flujo:**
```
Request API → 401 → isAuthError() → refreshToken() →
[Success] → retry request original →
[Fail] → handleAuthError() → redirect login
```

### 3. Página de Login

**Problema:** El timer de inactividad no debe correr en login

**Solución:** Agregar condición en useEffect

```typescript
if (window.location.pathname === ROUTER.LOGIN) return;
```

### 4. Loading Infinito

**Problema:** Error de red al cargar usuario deja UI en loading

**Solución:** Siempre ejecutar `setIsLoading(false)` en finally

```typescript
try {
  // cargar usuario
} catch (error) {
  // manejar error
} finally {
  setIsLoading(false); // SIEMPRE
}
```

### 5. Race Condition en Multi-Tab Logout

**Problema:** Dos tabs intentan logout al mismo tiempo

**Solución:** El storage event solo lee, no escribe. Solo una tab ejecuta logout completo.

## Archivos a Modificar

1. ✅ `web/services/api.service.ts`
   - Agregar `handleAuthError()`
   - Agregar `isAuthError()`
   - Modificar `request()` para detectar 401/403

2. ✅ `web/contexts/auth-context.tsx`
   - Modificar `loadUser()` para redirigir en error
   - Agregar inactivity timer useEffect
   - Agregar storage event listener para multi-tab

## Testing Manual

**Casos de Prueba:**

1. ✅ **Inactividad 30+ minutos**
   - Dejar sesión abierta sin tocar nada
   - Esperar 30 minutos
   - Resultado: Auto-logout y redirect a login

2. ✅ **Volver después de días**
   - Iniciar sesión
   - Cerrar browser sin logout
   - Volver al día siguiente
   - Resultado: Redirect automático a login

3. ✅ **Request con token expirado**
   - Simular token expirado en localStorage
   - Hacer cualquier request API
   - Resultado: Redirect a login

4. ✅ **Multi-tab logout**
   - Abrir 2 tabs con sesión activa
   - Hacer logout en tab A
   - Resultado: Tab B también redirige a login

5. ✅ **Reset de timer con actividad**
   - Mover mouse cada 20 minutos
   - Resultado: Sesión NO expira

6. ✅ **Refresh token exitoso**
   - Token access expira pero refresh válido
   - Hacer request
   - Resultado: Token se renueva, NO redirige

## Criterios de Aceptación

- ✅ Usuario es redirigido automáticamente a login cuando sesión expira
- ✅ No hay mensajes molestos (redirect limpio)
- ✅ Inactividad de 30+ minutos cierra sesión automáticamente
- ✅ Cualquier actividad (mouse, teclado, scroll) resetea el timer
- ✅ Logout en una tab cierra sesión en todas las tabs
- ✅ Refresh token se intenta antes de logout
- ✅ No hay loading infinito en caso de error
- ✅ Página de login no activa timer de inactividad

## Seguridad

**Mejoras de Seguridad:**
1. Sesiones no quedan abiertas indefinidamente
2. Token expirado no permite acceso a datos
3. Multi-tab evita sesión "zombie" en tabs olvidadas
4. Centralización de auth errors reduce superficie de ataque

**Consideraciones:**
- 30 minutos es balance entre seguridad y UX
- No guardar datos sensibles en localStorage (solo tokens)
- Refresh token también debe expirar en backend

## Notas de Implementación

- Usar `{ passive: true }` en event listeners para mejor performance
- `window.location.href` en lugar de `router.push()` para garantizar limpieza completa
- Timer usa `setTimeout` no `setInterval` (más eficiente)
- Storage event solo funciona entre tabs diferentes (no en la misma tab)

## Futuras Mejoras (No incluidas en MVP)

1. **Warning 5 minutos antes de expirar**
   - Toast informativo
   - Permite al usuario extender sesión

2. **Persistir ruta para redirect post-login**
   - Volver a donde estaba el usuario
   - Mejor UX para deep links

3. **Diferentes timeouts por rol**
   - Admin: 60 min
   - Cajero: 30 min
   - Player: 30 min

4. **Heartbeat ping al backend**
   - Verificar sesión válida cada 5 minutos
   - Backend puede invalidar sesión de forma centralizada

5. **Analytics de sesiones**
   - Rastrear tiempo promedio de sesión
   - Detectar patrones de inactividad
   - Optimizar timeout basado en datos reales
