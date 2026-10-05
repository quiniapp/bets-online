# Optimizar rotateTokens con JOIN para eliminar SELECT de usuario en MISS

## Problema actual

Cuando el `userCache` no tiene al usuario (MISS), el refresh hace 2 DB ops:

```
1. usersRepository.findById()   → SELECT FROM users WHERE id = ?
2. sessionsRepository.rotateTokens() → UPDATE sessions WHERE refresh_token = ?
```

## Solución: JOIN en rotateTokens

Una sola query que valida la sesión, rota los tokens Y trae los datos del usuario:

```sql
UPDATE sessions s
SET
  token       = :newToken,
  refresh_token = :newRefreshToken,
  expires_at  = :newExpiresAt
FROM users u
WHERE s.refresh_token = :oldRefreshToken
  AND s.expires_at > NOW()
  AND s.user_id = u.id
  AND u.status  != 'BLOCKED'
RETURNING
  s.id, s.user_id, s.token, s.refresh_token, s.expires_at,
  u.id         AS u_id,
  u.role       AS u_role,
  u.status     AS u_status,
  u.username   AS u_username,
  u.first_name AS u_first_name,
  u.last_name  AS u_last_name,
  u.email      AS u_email
```

Beneficios:
- 2 ops → 1 op incluso en cache MISS
- El check `u.status != 'BLOCKED'` elimina la validación manual en el domain
- Atómico: si el usuario fue bloqueado entre el verify JWT y el rotate, la query falla sola

## Impacto en el código

### `sessions.repository.ts`

Cambiar la firma de `rotateTokens()`:

```typescript
interface RotateTokensResult {
  session: Session;
  user: Pick<User, 'id' | 'role' | 'status' | 'username' | 'firstName' | 'lastName' | 'email'>;
}

async rotateTokens(
  oldRefreshToken: string,
  newToken: string,
  newRefreshToken: string,
  expiresAt: Date
): Promise<RotateTokensResult | null>
```

Implementación con Sequelize usando `QueryTypes.SELECT` y raw query (Sequelize no soporta UPDATE...FROM...RETURNING de forma nativa):

```typescript
const [rows] = await sequelize.query(`
  UPDATE sessions s
  SET token = :newToken, refresh_token = :newRefreshToken, expires_at = :expiresAt
  FROM users u
  WHERE s.refresh_token = :oldRefreshToken
    AND s.expires_at > NOW()
    AND s.user_id = u.id
    AND u.status != 'BLOCKED'
  RETURNING s.id, s.user_id, s.token, s.refresh_token, s.expires_at, s.created_at,
            u.id as u_id, u.role as u_role, u.status as u_status, u.username as u_username
`, {
  replacements: { newToken, newRefreshToken, expiresAt, oldRefreshToken },
  type: QueryTypes.SELECT
});

if (!rows || rows.length === 0) return null;
// mapear rows[0] a { session, user }
```

### `auth.domain.ts`

Simplificar `refreshToken()`:

```typescript
// Antes: 2 pasos separados (findById + rotateTokens)
// Después: 1 paso con datos del usuario incluidos
const result = await sessionsRepository.rotateTokens(...);
if (!result) throw new AppError(401, ...);

const { session, user } = result;
// No necesita ir al cache ni a la DB por el usuario
userCache.set(user as User); // Actualizar cache con datos frescos
```

## Cuándo implementar

Cuando los métricas de DB muestren que los MISSes de userCache son frecuentes
(por ejemplo: múltiples instancias en Railway, reinicios frecuentes, o >1000 usuarios activos).

Con el sliding window del authMiddleware y TTL de 20 min, los MISSes son raros
para usuarios activos en una instancia única.
