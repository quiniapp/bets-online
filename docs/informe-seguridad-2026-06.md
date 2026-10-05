# Informe de Seguridad — bets-online

**Fecha:** 2026-06-11 · **Alcance:** `api` (Express/Railway), `web` y `web-admin` (Next.js/Vercel), base de datos (Supabase Postgres), almacenamiento (Supabase Storage).

## Estado al 2026-10-04

Aplicado después del informe: A1 Swagger solo fuera de producción, A2 `/api/csrf-token` detrás de `globalLimiter`, A4 audit log en chips / users / settings / auth (`api/src/utils/audit.ts`), M1 `userCache` rechaza `BLOCKED` en `authMiddleware`, M2 cookie CSRF `sameSite: strict`, M3 throttle por cuenta con backoff exponencial (`api/src/utils/login-throttle.ts`), M4 whitelist de mimetypes (png / jpeg / webp / gif) y procesamiento con sharp, M5 CSP (enforced en `web-admin`, Report-Only en `web`) + HSTS / Referrer-Policy / Permissions-Policy, M6 `web/app/admin` eliminado, B1 logger pino en `errorHandler`, B2 bcrypt 12 rounds, B4 `express.json({ limit: '100kb' })` explícito, B6 `urlencoded` removido.

Pendiente: A3 verificar en el dashboard de Railway que los secrets JWT sean aleatorios y de 32+ chars (no verificable desde el repo). M4 validación por magic bytes (`file-type`) no se agregó. B3 descartado por decisión de producto: 8 caracteres mínimo para todos los roles. La CSP de `web` sigue Report-Only hasta pinear los dominios de los iframes de proveedores.

---

## Resumen ejecutivo

La base es sólida: cookies httpOnly+secure+sameSite, CSRF double-submit con comparación timing-safe, rate limiting en login/refresh, HMAC timing-safe en callbacks de 21viral, validación Zod generalizada, autorización por subárbol + jerarquía de roles, `passwordHash` aislado en métodos `*ForAuth`, y queries parametrizadas (sin interpolación de SQL detectada). Los hallazgos de mayor impacto son de **configuración y exposición**, no de código: Swagger público, endpoint CSRF sin rate limit, y verificación pendiente de secretos en Railway.

---


## Hallazgos ALTOS

### A1. Swagger `/doc` público en producción
`api/src/server.ts:82` monta Swagger UI sin autenticación y **antes** del rate limiter global. Expone la superficie completa del API (rutas, parámetros, esquemas) a cualquier visitante de la URL de Railway.
**Fix:** deshabilitar en producción (`if (config.server.env !== 'production')`) o proteger con auth básico.

### A2. `GET /api/csrf-token` sin rate limit
Está registrado en `server.ts:86` **antes** de `app.use('/api', globalLimiter, ...)`, así que no le aplica ningún límite. Cada llamada genera bytes aleatorios + Set-Cookie: vector barato de DoS y de llenado de logs.
**Fix:** mover el endpoint detrás del `globalLimiter` o aplicarle un limiter propio.

### A3. Verificar secretos JWT en Railway
`api/.env.production` local contiene placeholders (`JWT_SECRET=your-...`, `JWT_REFRESH_SECRET=your-...`, `SESSION_SECRET=your-...`). El archivo **no está commiteado** (bien) y Railway inyecta sus propias vars (dotenv no las pisa), pero hay que **confirmar en el dashboard de Railway** que los valores reales sean aleatorios y ≥32 chars. Si alguna vez el proceso arrancara leyendo este archivo, cualquiera podría forjar tokens de OWNER.
**Fix:** verificar dashboard; borrar los placeholders del archivo local o renombrarlo.

### A4. Sin auditoría de acciones sensibles
`audit-log.model.ts` existe pero **nunca se escribe** (solo está registrado en el índice de modelos). En un casino, cargas/retiros de fichas, bloqueos, resets de contraseña y cambios de configuración necesitan trazabilidad de *quién hizo qué y cuándo* — tanto por disputas internas como por compliance.
**Fix:** escribir audit log en `chips.domain` (sell/withdraw/adjust), `users.domain` (block/reset/create) y settings. Incluir requesterId, targetId, acción, monto, IP.

---

## Hallazgos MEDIOS

### M1. Revocación con retardo de hasta 15 min
El access token es JWT stateless: al **bloquear** un usuario o resetear su contraseña, sus requests siguen pasando el `authMiddleware` hasta que el token expire (≤15 min). El refresh sí muere al instante (chequea DB y status BLOCKED).
**Fix (opcional):** en `authMiddleware`, consultar `userCache` (ya existe) y rechazar si `status === 'BLOCKED'`; al bloquear, poblar el cache con el estado nuevo + `sessionsRepository.deleteByUserId`. Costo ~0 (Map en memoria, single instance).

### M2. Cookie CSRF con `sameSite: 'none'` en producción
`server.ts:91`. El esquema double-submit sigue siendo válido (el atacante no puede leer la cookie ni setear el header cross-origin con CORS restringido), pero `'none'` es más laxo de lo necesario: todo el tráfico es same-origin vía rewrites de Vercel.
**Fix:** `'lax'` (o `'strict'`) también en producción. Probar el flujo de uploads tras el cambio.

### M3. Rate limit de login por IP, no por cuenta
`authLimiter` = 10 intentos/15 min **por IP**. Un ataque distribuido (o usuarios reales detrás de CGNAT compartiendo IP) lo evade/sufre respectivamente. No hay lockout por cuenta ni captcha.
**Fix:** contador adicional por username (en memoria o tabla) con backoff exponencial; opcional captcha tras N fallos.

### M4. Validación de uploads solo por mimetype declarado
`upload.middleware.ts` filtra por `file.mimetype` (lo declara el cliente) y permite cualquier `image/*`, incluido `image/svg+xml` (los SVG pueden llevar scripts; se sirven desde el dominio público de Supabase, no del sitio — riesgo acotado pero innecesario).
**Fix:** lista blanca explícita (`image/png`, `image/jpeg`, `image/webp`, `image/gif`) + validación de magic bytes (paquete `file-type`).

### M5. Sin Content-Security-Policy en los frontends
Next.js no emite CSP por defecto. Para un sitio que embebe juegos de terceros en iframes, una CSP con `frame-src` limitado a los dominios del integrador + `script-src 'self'` reduce mucho el impacto de cualquier XSS.
**Fix:** headers en `next.config.mjs` de ambas apps (empezar en modo `Report-Only`).

### M6. Panel admin duplicado dentro del sitio público
`web/app/admin/**` replica las páginas de `web-admin` dentro del sitio de jugadores. El backend valida roles igualmente, pero duplica superficie de ataque, confunde el mantenimiento (ya divergieron: el fix del upload de logos había que aplicarlo dos veces) y agranda el bundle público.
**Fix:** eliminar `web/app/admin/**` del sitio público (o confirmar que es intencional y montar un guard de rol en el layout).

---

## Hallazgos BAJOS / housekeeping

- **B1.** `errorHandler` usa `console.error` en vez del logger pino estructurado (`error.middleware.ts:23`); en producción conviene log estructurado con requestId.
- **B2.** bcrypt rounds = 10. Aceptable; 12 sería mejor si el login no es crítico en latencia.
- **B3.** Política de contraseñas: solo `min(8)`. Para cuentas ADMIN/OWNER considerar mínimo 12 + chequeo contra contraseñas comunes.
- **B4.** `express.json()` con límite default (100 kb) — correcto, pero hacerlo explícito documenta la intención.
- **B5.** La exención CSRF por header `Authorization` (`server.ts:53`) es correcta, pero asegurarse de que ningún endpoint acepte tokens por query string en el futuro.
- **B6.** `body-parser` para `urlencoded` está habilitado pero el API solo consume JSON/multipart; se puede quitar.

## Lo que está bien (mantener)

- Cookies de sesión `httpOnly + secure + sameSite:strict`, refresh cookie con `path=/api/auth/refresh`.
- CSRF double-submit con `crypto.timingSafeEqual`.
- HMAC SHA-256 timing-safe + rate limit dedicado en callbacks 21viral.
- Zod en todos los bodies; `validateParams` para UUIDs.
- Autorización consistente: subárbol (CTE recursivo) + `canManageUser` por jerarquía.
- `passwordHash` nunca sale de los métodos `*ForAuth`; mappers lo excluyen; sin `SELECT *` en users.
- Rotación de refresh tokens con ventana de gracia para tabs concurrentes; sesiones con ventana de inactividad de 30 min server-side (desde 2026-06).
- `helmet()` activo; `trust proxy 1` correcto para Railway.
- Claves de storage sanitizadas (`safeKeySegment` / `safeImageFileName`) — sin path traversal.

## Prioridad sugerida

1. A1 + A2 (5 líneas, riesgo alto, cero impacto funcional)
2. A3 (verificación en dashboard, 10 min)
3. A4 (audit log — medio día)
4. M1, M2, M4 (1-2 h c/u)
5. M3, M5, M6 (planificar)
