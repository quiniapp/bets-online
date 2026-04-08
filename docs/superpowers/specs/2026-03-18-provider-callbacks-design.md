# Design: feature/provider-callbacks — Integración 21Viral (Callbacks del Provider)

**Fecha:** 2026-03-18
**Rama:** `feature/provider-callbacks`
**Parte de:** Integración 21Viral (Opción C — sub-ramas independientes)

---

## 1. Contexto

21Viral actúa como Provider Game Server (PGS). Nuestro backend actúa como Operator Game Server (OGS). Durante las sesiones de juego, 21Viral realiza callbacks server-to-server hacia nuestro backend para:

1. Consultar el balance del jugador (`ProviderGetBalanceRequest`)
2. Procesar transacciones de apuesta y ganancia (`ProviderTransactionRequest`)

Todos los requests entrantes se autentican con HMAC-SHA256 usando JSON canonicalizado según RFC 8785.

Credenciales de staging en `.env`:
- `VIRAL_USERNAME` — authentication username enviado por 21Viral (⚠️ no usar `USERNAME`, colisiona con variable de OS Unix/Linux)
- `VIRAL_SECRET_KEY` — shared secret para verificar/generar firmas HMAC
- `INTEGRATOR_URL` — base URL del provider (para llamadas salientes, usado en ramas futuras)

Referencia técnica: `docs/rfc8785-hmac-sha256.md`

**Decisión de unidad monetaria:** 1 chip = 1 ARS. El campo `chip_balance` en la tabla `balances` representa pesos argentinos. Se expone como `balance` string con `currency: "ARS"` hacia 21Viral. Toda escritura al campo `chip_balance` debe redondearse a 2 decimales usando `ROUND_HALF_UP` (via Decimal.js) antes de persistir.

**Sobre `providerTransactionId` en Reversals:** Según la spec de 21Viral §3.3, en un request de tipo Reversal, el campo `providerTransactionId` contiene el ID de la transacción original que debe revertirse (no un ID nuevo del reversal). Por eso la búsqueda de la transacción original se hace filtrando `transaction_type IN ('Debit', 'Credit')` usando ese mismo campo.

---

## 2. Alcance de esta rama

- Migraciones de DB: `user_provider_profiles` y `provider_transactions`
- Middleware HMAC parametrizable por proveedor
- Endpoints que recibe 21Viral: `/api/integrations/21viral/players/balance` y `/api/integrations/21viral/players/transactions`
- Idempotencia con manejo de race conditions (PG error `23505`)
- Enums, tipos y validators en `helper/`
- Actualización de `BalancesRepository` para soportar `transaction` de Sequelize

**Fuera de alcance:** catálogo de juegos, launch de sesión, frontend, jackpot API.

---

## 3. Base de datos

### 3.1 Tabla `user_provider_profiles`

```sql
CREATE TABLE user_provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_name VARCHAR(50) NOT NULL,
  provider_player_id VARCHAR(255) NOT NULL,  -- numeric string autoincremental
  currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
  country_code VARCHAR(2) NOT NULL DEFAULT 'AR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider_name),
  UNIQUE(provider_name, provider_player_id)
);
```

**Notas:**
- `provider_player_id` para 21Viral es un string numérico generado con una DB sequence al crear el perfil
- `currency` default `'ARS'` — Pesos Argentinos (ISO 4217)
- `country_code` default `'AR'` — Argentina (ISO 3166-1 alpha-2)

### 3.2 Tabla `provider_transactions`

```sql
CREATE TABLE provider_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(50) NOT NULL,
  provider_transaction_id VARCHAR(255) NOT NULL,
  provider_game_round_id VARCHAR(255),
  provider_game_id VARCHAR(255),
  provider_player_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_type VARCHAR(20) NOT NULL,       -- TransactionType enum
  bet_type VARCHAR(50),                         -- BetType enum
  game_round_status VARCHAR(20),                -- GameRoundStatus enum
  amount DECIMAL(15,4) NOT NULL,                -- 4 decimales para precisión; se redondea a 2 al escribir en balances
  currency VARCHAR(3) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,         -- espeja chip_balance post-operación (2 decimales, ya redondeado)
  bet_outcome_event_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- Idempotencia: misma tx + mismo tipo = un solo registro
  -- Un mismo providerTransactionId puede existir como Debit Y como Reversal (IDs distintos por spec)
  UNIQUE(provider_name, provider_transaction_id, transaction_type)
);

-- Índice para búsqueda de transacción original en flujo Reversal
CREATE INDEX idx_provider_tx_reversal_lookup
  ON provider_transactions(provider_name, provider_transaction_id, transaction_type);
```

**Nota:** se elimina la columna `already_processed` — era siempre `false` en DB y no aportaba información útil. El flag `alreadyProcessed: true` en la respuesta es transitorio (se genera al detectar la fila existente en el check de idempotencia, no se persiste).

---

## 4. Estructura de archivos

```
api/src/
├── middleware/
│   └── hmac.middleware.ts
├── routes/
│   └── integrations/
│       └── 21viral/
│           ├── index.ts
│           ├── balance.routes.ts
│           └── transactions.routes.ts
├── controllers/
│   └── integrations/
│       └── 21viral/
│           ├── balance.controller.ts
│           └── transactions.controller.ts
├── domain/
│   └── integrations/
│       └── 21viral/
│           ├── balance.domain.ts
│           └── transactions.domain.ts
└── persistence/
    ├── models/
    │   ├── UserProviderProfile.model.ts
    │   └── ProviderTransaction.model.ts
    ├── repositories/
    │   ├── userProviderProfile.repository.ts
    │   ├── providerTransaction.repository.ts
    │   └── balances.repository.ts  ← actualizar métodos para aceptar Sequelize Transaction
    └── migrations/
        ├── YYYYMMDD-create-user-provider-profiles.js
        └── YYYYMMDD-create-provider-transactions.js

helper/src/
├── types/
│   └── provider.types.ts
└── validators/
    └── provider.validator.ts
```

---

## 5. Autenticación — HMAC Middleware

### Firma
```typescript
interface HmacMiddlewareConfig {
  username: string;                    // process.env.VIRAL_USERNAME
  secretKey: string;                   // process.env.VIRAL_SECRET_KEY
  providerName: string;                // '21viral'
  timestampToleranceSeconds?: number;  // default: 300 (5 min)
}

export const createHmacMiddleware = (config: HmacMiddlewareConfig) => RequestHandler
```

### Flujo
1. Extraer header `Authorization: HMAC-SHA256 <username>:<hexSignature>`
2. Verificar que `username` coincide con `config.username`
3. Validar `|Math.floor(Date.now()/1000) - req.body.timestamp| <= timestampToleranceSeconds` → protege contra replay attacks
4. Canonicalizar `req.body` según RFC 8785
5. Calcular `HMAC-SHA256(secretKey, canonicalBody)` con `crypto.createHmac`
6. **Antes de `timingSafeEqual`:** verificar que `receivedSignature.length === expectedSignature.length` (longitudes en hex son siempre iguales para SHA256 = 64 chars). Si difiere → `AuthenticationFailure` 401 sin llamar a `timingSafeEqual`
7. Comparar con `crypto.timingSafeEqual` usando Buffers hex-decoded
8. Si falla cualquier paso → `{ viralErrorCode: 'AuthenticationFailure', message: '...' }` HTTP 401

### Montaje en server.ts
```typescript
app.use(
  '/api/integrations/21viral',
  createHmacMiddleware({
    username: process.env.VIRAL_USERNAME,
    secretKey: process.env.VIRAL_SECRET_KEY,
    providerName: '21viral'
  }),
  viral21Router
);
```

**Endpoints resultantes:**
- `POST /api/integrations/21viral/players/balance`
- `POST /api/integrations/21viral/players/transactions`

---

## 6. Endpoint: Balance

### `POST /api/integrations/21viral/players/balance`

**Request de 21Viral:**
```typescript
{
  token: string;           // aceptado, no validado contra sessions (ver nota)
  providerGameId?: string;
  providerName?: string;
  timestamp: number;
  playerId: string;        // numeric string = provider_player_id
}
```

> **Nota sobre `token`:** se acepta pero no se valida contra nuestra tabla `sessions`. La autenticación ya está garantizada por HMAC. Puede revisarse en iteraciones futuras.

**Flujo del domain:**
1. Buscar `UserProviderProfile` por `provider_player_id = playerId` AND `provider_name = '21viral'`
2. No existe → `PlayerNotActive` 422
3. Verificar `user.status`:
   - `BLOCKED` → `PlayerBlocked` 422
   - distinto de `ACTIVE` → `PlayerNotActive` 422
4. Verificar `userProviderProfile.is_active === true` → `PlayerNotActive` 422
5. Obtener `balance.chip_balance` de la tabla `balances`
6. Formatear con 2 decimales: `new Decimal(chipBalance).toFixed(2)`

**Response:**
```typescript
{
  balance: "100.00",    // chip_balance formateado a 2 decimales
  currency: "ARS",
  // Campos opcionales — omitidos si no aplica:
  promoBalance?: string;  // no implementado (sin promo wallet)
  freeSpins?: number;     // no implementado (sin operator free spins)
  freeStake?: string;     // no implementado (requerido si freeSpins está presente)
}
```

> **Nota MVP:** `promoBalance`, `freeSpins` y `freeStake` son opcionales en la API oficial. No se devuelven en esta implementación ya que no soportamos promo wallets ni operator free spins. Se pueden agregar en una iteración futura.

No aplica idempotencia (per spec 21Viral §3.4).

---

## 7. Endpoint: Transactions

### `POST /api/integrations/21viral/players/transactions`

**Request de 21Viral:**
```typescript
{
  transactionType: TransactionType;
  betType: BetType;
  gameRoundStatus: GameRoundStatus;
  providerGameId?: string;
  providerName?: string;
  timestamp: number;
  playerId: string;
  token?: string;
  amount: string;                   // parsear con Decimal.js, nunca parseFloat
  currency?: string;
  providerGameRoundId: string;
  providerTransactionId: string;    // en Reversal: ID de la tx original a revertir
  betOutcomeEventData?: BetOutcomeEventData;
}
```

**Flujo del domain — todo dentro de una transacción Sequelize (pasada a todos los métodos de repositorio):**

```
1. Buscar UserProviderProfile por playerId + '21viral'
   → No existe: PlayerNotActive 422

2. Verificar user.status
   → BLOCKED: PlayerBlocked 422
   → no ACTIVE: PlayerNotActive 422

3. Verificar userProviderProfile.is_active
   → false: PlayerNotActive 422

4. Verificar CurrencyMismatch
   → request.currency existe Y != userProviderProfile.currency: CurrencyMismatch 422

5. Verificar idempotencia:
   SELECT en provider_transactions
   WHERE provider_name = '21viral'
     AND provider_transaction_id = req.providerTransactionId
     AND transaction_type = req.transactionType

   a) Existe, mismo amount → retornar { balance: existingTx.balance_after, currency, operatorTransactionId: existingTx.id, alreadyProcessed: true }
   b) Existe, distinto amount → DoubleTransactionWithDifferentAmount 422
   c) No existe → continuar

6. SELECT balance FOR UPDATE (dentro de la tx de Sequelize)

7. Según transactionType:

   ── DEBIT ──
   - Verificar chip_balance >= Decimal(amount) → InsufficientFunds 422
   - nuevoBalance = Decimal(chip_balance).minus(amount).toDecimalPlaces(2, ROUND_HALF_UP)
   - UPDATE balances SET chip_balance = nuevoBalance [con transaction]
   - INSERT provider_transactions con balance_after = nuevoBalance [con transaction]
   - COMMIT

   ── CREDIT ──
   - nuevoBalance = Decimal(chip_balance).plus(amount).toDecimalPlaces(2, ROUND_HALF_UP)
   - UPDATE balances SET chip_balance = nuevoBalance [con transaction]
   - INSERT provider_transactions con balance_after = nuevoBalance [con transaction]
   - COMMIT

   ── REVERSAL ──
   - Buscar transacción original:
     SELECT WHERE provider_name = '21viral'
       AND provider_transaction_id = req.providerTransactionId
       AND transaction_type IN ('Debit', 'Credit')
     → No existe: GameRoundNotFound 422
     → Es Reversal: GameRoundNotFound 422 (Reversal de Reversal no permitido)

   - Si originalTx.transaction_type = 'Debit':
     nuevoBalance = Decimal(chip_balance).plus(originalTx.amount).toDecimalPlaces(2, ROUND_HALF_UP)

   - Si originalTx.transaction_type = 'Credit':
     nuevoBalance = Decimal(chip_balance).minus(originalTx.amount).toDecimalPlaces(2, ROUND_HALF_UP)
     Si nuevoBalance < 0 → clampear a Decimal(0) (no InsufficientFunds para Reversals)

   - UPDATE balances SET chip_balance = nuevoBalance [con transaction]
   - INSERT provider_transactions (transaction_type = 'Reversal') [con transaction]
   - COMMIT

8. Race condition (paso 5c → INSERT falla con PG error 23505):
   → ROLLBACK automático del Sequelize transaction
   → catch el error 23505
   → Re-SELECT la fila existente (fuera de transaction)
   → Retornar con alreadyProcessed: true
```

**Response:**
```typescript
{
  balance: string;                // chip_balance actualizado formateado "99.00"
  currency: string;               // "ARS"
  operatorTransactionId: string;  // id del INSERT en provider_transactions
  alreadyProcessed?: boolean;     // true solo en idempotencia
  // Campos opcionales — omitidos si no aplica:
  promoBalance?: string;          // no implementado (sin promo wallet)
  promo?: string;                 // no implementado (cuánto del bet se pagó con promo)
  freeSpins?: number;             // no implementado (sin operator free spins)
  freeStake?: string;             // no implementado (requerido si freeSpins está presente)
}
```

> **Nota MVP:** los campos `promoBalance`, `promo`, `freeSpins` y `freeStake` son opcionales en la API oficial. No se devuelven en esta implementación. Agregar cuando se soporte promo wallet u operator free spins.

---

## 8. Actualización requerida: `BalancesRepository`

Los métodos existentes `incrementBalance` y `decrementBalance` deben actualizarse para aceptar un parámetro opcional `transaction: Transaction` (Sequelize) y pasarlo a todos los `findOne`/`update` internos. Sin esto, las operaciones de balance quedan fuera de la transacción atómica y rompen la consistencia.

```typescript
// Firma actualizada (ejemplo):
async updateChipBalance(
  userId: string,
  newBalance: Decimal,
  transaction?: Transaction
): Promise<void>
```

---

## 9. Tipos y Enums (helper/)

### `helper/src/types/provider.types.ts`

```typescript
export enum TransactionType {
  Debit = 'Debit',
  Credit = 'Credit',
  Reversal = 'Reversal'
}

export enum BetType {
  Cash = 'Cash',
  Promo = 'Promo',
  OperatorFreeSpinBonus = 'OperatorFreeSpinBonus',
  ProviderFreeSpinBonus = 'ProviderFreeSpinBonus'
}

export enum GameRoundStatus {
  Started = 'Started',
  InProgress = 'InProgress',
  None = 'None',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export enum ViralErrorCode {
  GeneralFailure = 'GeneralFailure',
  AuthenticationFailure = 'AuthenticationFailure',
  RequestValidationFailure = 'RequestValidationFailure',
  InsufficientFunds = 'InsufficientFunds',
  PlayerNotActive = 'PlayerNotActive',
  PlayerBlocked = 'PlayerBlocked',
  PlayerFrozen = 'PlayerFrozen',
  PlayerSelfExclusion = 'PlayerSelfExclusion',
  GameDisabled = 'GameDisabled',
  CurrencyMismatch = 'CurrencyMismatch',
  GameRoundNotFound = 'GameRoundNotFound',
  DoubleTransactionWithDifferentAmount = 'DoubleTransactionWithDifferentAmount',
  RealMoneyNotAllowed = 'RealMoneyNotAllowed',
  LossLimitExceeded = 'LossLimitExceeded',
  SpendLimitExceeded = 'SpendLimitExceeded'
}

export enum AwardType {
  Money = 'Money'
}

export enum JackpotType {
  Jackpot = 'Jackpot',
  GlobalJackpot = 'GlobalJackpot'
}

export enum ReversalOfType {
  Credit = 'Credit',
  Debit = 'Debit'
}

// Requests entrantes de 21Viral
export interface ProviderBalanceRequest {
  token: string;
  providerGameId?: string;
  providerName?: string;
  timestamp: number;
  playerId: string;
}

export interface ProviderTransactionRequest {
  transactionType: TransactionType;
  betType: BetType;
  gameRoundStatus: GameRoundStatus;
  providerGameId?: string;
  providerName?: string;
  timestamp: number;
  playerId: string;
  token?: string;
  amount: string;
  currency?: string;
  providerGameRoundId: string;
  providerTransactionId: string;
  betOutcomeEventData?: BetOutcomeEventData;
}

// Respuestas hacia 21Viral
export interface ProviderBalanceResponse {
  balance: string;
  currency: string;
  // Opcionales — no implementados en MVP (sin promo wallet / operator free spins):
  promoBalance?: string;
  freeSpins?: number;
  freeStake?: string;
}

export interface ProviderTransactionResponse {
  balance: string;
  currency: string;
  operatorTransactionId: string;
  alreadyProcessed?: boolean;
  // Opcionales — no implementados en MVP:
  promoBalance?: string;
  promo?: string;
  freeSpins?: number;
  freeStake?: string;
}

// Eventos especiales
export interface BetOutcomeEventData {
  jackpotWins?: BetOutcomeWin[];
  tournamentWins?: BetOutcomeWin[];
  campaignWins?: BetOutcomeWin[];
  cashBonusWins?: BetOutcomeWin[];
  reversalOfType?: ReversalOfType;
}

export interface BetOutcomeWin {
  amount: string;
  awardType: AwardType;
  id: string;
  type?: JackpotType;
}

// Error format exigido por 21Viral
export interface ViralErrorResponse {
  viralErrorCode: ViralErrorCode;
  message: string;
}

export interface UserProviderProfile {
  id: string;
  userId: string;
  providerName: string;
  providerPlayerId: string;
  currency: string;
  countryCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### `helper/src/validators/provider.validator.ts`

```typescript
import { z } from 'zod';
import { TransactionType, BetType, GameRoundStatus } from '../types/provider.types';

const betOutcomeWinSchema = z.object({
  amount: z.string(),
  awardType: z.string(),
  id: z.string(),
  type: z.string().optional()
});

const betOutcomeEventDataSchema = z.object({
  jackpotWins: z.array(betOutcomeWinSchema).optional(),
  tournamentWins: z.array(betOutcomeWinSchema).optional(),
  campaignWins: z.array(betOutcomeWinSchema).optional(),
  cashBonusWins: z.array(betOutcomeWinSchema).optional(),
  reversalOfType: z.string().optional()
}).optional();

export const providerBalanceRequestSchema = z.object({
  token: z.string(),
  providerGameId: z.string().optional(),
  providerName: z.string().optional(),
  timestamp: z.number().int(),
  playerId: z.string().regex(/^\d+$/, 'playerId must be a numeric string')
});

export const providerTransactionRequestSchema = z.object({
  transactionType: z.nativeEnum(TransactionType),
  betType: z.nativeEnum(BetType),
  gameRoundStatus: z.nativeEnum(GameRoundStatus),
  providerGameId: z.string().optional(),
  providerName: z.string().optional(),
  timestamp: z.number().int(),
  playerId: z.string().regex(/^\d+$/, 'playerId must be a numeric string'),
  token: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/, 'amount must be a numeric string'),
  currency: z.string().length(3).optional(),
  providerGameRoundId: z.string(),
  providerTransactionId: z.string(),
  betOutcomeEventData: betOutcomeEventDataSchema
});
```

---

## 10. Manejo de errores

```typescript
{ viralErrorCode: ViralErrorCode, message: string }
```

| Situación | viralErrorCode | HTTP |
|-----------|---------------|------|
| HMAC inválido / username incorrecto / timestamp fuera de rango | `AuthenticationFailure` | 401 |
| Body inválido (Zod) | `RequestValidationFailure` | 422 |
| Balance insuficiente (solo Debit) | `InsufficientFunds` | 422 |
| Usuario no encontrado / inactivo / PENDING / perfil inactivo | `PlayerNotActive` | 422 |
| Usuario BLOCKED | `PlayerBlocked` | 422 |
| Moneda del request != moneda del perfil | `CurrencyMismatch` | 422 |
| Transacción original no encontrada (solo Reversal) | `GameRoundNotFound` | 422 |
| Reversal de un Reversal | `GameRoundNotFound` | 422 |
| Misma transacción, distinto monto | `DoubleTransactionWithDifferentAmount` | 422 |
| Error inesperado | `GeneralFailure` | 500 |

---

## 11. Consideraciones de seguridad

- **`timingSafeEqual`**: validar longitud (64 hex chars para SHA256) antes de llamarlo para evitar `TypeError`
- **Timestamp tolerance**: rechazar requests con `|now - timestamp| > 300s` (protege contra replay attacks)
- **`VIRAL_USERNAME`**: nunca usar `USERNAME` (colisiona con variable de OS)
- **DB transactions atómicas**: `SELECT ... FOR UPDATE` en balance + INSERT en provider_transactions en una sola Sequelize transaction
- **Race condition (23505)**: capturar unique_violation, re-SELECT, retornar `alreadyProcessed: true`
- **Decimal.js**: nunca `parseFloat` para montos monetarios
- **IP Whitelist** (nivel infra): staging IPs de 21Viral son `75.2.84.22` y `35.71.154.198`

---

## 12. Casos de test requeridos

| # | Escenario | Resultado esperado |
|---|-----------|-------------------|
| 1 | HMAC inválido | `AuthenticationFailure` 401 |
| 2 | Timestamp fuera de tolerancia (> 5 min) | `AuthenticationFailure` 401 |
| 3 | `timingSafeEqual` con signature de longitud incorrecta | `AuthenticationFailure` 401 (no 500) |
| 4 | Body inválido (campo faltante) | `RequestValidationFailure` 422 |
| 5 | Debit exitoso | balance decrementado, tx registrada |
| 6 | Debit con fondos insuficientes | `InsufficientFunds` 422 |
| 7 | Credit exitoso | balance incrementado, tx registrada |
| 8 | Reversal de Debit exitoso | balance restaurado |
| 9 | Reversal de Credit — balance suficiente | balance reducido correctamente |
| 10 | Reversal de Credit — balance insuficiente | balance clampeado a 0 (no error) |
| 11 | Reversal de transacción inexistente | `GameRoundNotFound` 422 |
| 12 | Reversal de un Reversal | `GameRoundNotFound` 422 |
| 13 | Request idempotente (mismo providerTransactionId + type, mismo amount) | `alreadyProcessed: true`, sin cambios en DB |
| 14 | Request idempotente con distinto amount | `DoubleTransactionWithDifferentAmount` 422 |
| 15 | Usuario bloqueado | `PlayerBlocked` 422 |
| 16 | CurrencyMismatch | `CurrencyMismatch` 422 |
| 17 | Perfil inactivo (`is_active = false`) | `PlayerNotActive` 422 |
| 18 | Concurrencia: dos requests simultáneos con mismo providerTransactionId | uno procesa, el otro retorna `alreadyProcessed: true` (no 500) |

---

## 13. Orden de implementación

1. Variables de entorno: renombrar `USERNAME` → `VIRAL_USERNAME`, `SECRET_KEY` → `VIRAL_SECRET_KEY` en `.env` y `.env.example`
2. Instalar dependencia: `decimal.js` (o `pnpm add decimal.js`)
3. Migraciones: `user_provider_profiles` y `provider_transactions`
4. Modelos Sequelize y repositories (incluyendo actualización de `BalancesRepository` para aceptar `Transaction`)
5. Enums, tipos e interfaces en `helper/types/provider.types.ts`
6. Validators Zod en `helper/validators/provider.validator.ts`
7. HMAC middleware con validación de timestamp y longitud de signature
8. Domain: balance (con checks de user.status e is_active)
9. Domain: transactions (con DB transaction atómica, Decimal.js, idempotencia y manejo de race condition)
10. Controllers + routes bajo `/api/integrations/21viral/`
11. Montaje en `server.ts`
12. Tests de integración (18 casos de la sección 12)

> ✅ **Completado:** todos los puntos anteriores fueron implementados en `feature/provider-callbacks` (PR #19, merged 2026-03-26).

---

## 14. Game Launch — Operador → Provider *(rama futura)*

> **Scope:** `feature/game-launch` o similar. Esta sección documenta los endpoints que el Operador debe llamar al Provider para obtener la lista de juegos y generar URLs de sesión.

### 14.1 OperatorGamesRequest

Obtiene el catálogo de juegos disponibles. **En producción: máximo 1 llamada por hora.**

```
POST https://api.stg.games-viral.com/v1/games
Authorization: HMAC-SHA256 <VIRAL_USERNAME>:<hexSignature>
```

**Request body:**
```typescript
{ timestamp: number }
```

**Response body (array de juegos):**
```typescript
{
  id: number;            // ID del juego en el sistema del Provider
  name: string;
  type: string;
  defaultLogo: string;   // URL de thumbnail
  providerName: string;  // e.g. "pragmatic"
  providerGameId: string // e.g. "vs20olympgate"
}[]
```

### 14.2 OperatorStartGameUrlRequest

Genera la URL de sesión para lanzar un juego al jugador.

```
POST https://api.stg.games-viral.com/v1/games/sessions
Authorization: HMAC-SHA256 <VIRAL_USERNAME>:<hexSignature>
```

**Request body:**
```typescript
{
  timestamp: number;           // Unix epoch
  playerId: string;            // Numeric string — provider_player_id del UserProviderProfile
  playerUserName: string;      // Username del jugador en nuestro sistema
  playerDeviceType: 'Desktop' | 'Mobile';
  providerName: string;        // e.g. "pragmatic"
  providerGameId: string;      // e.g. "vs20olympgate"
  gameMode: 'Real' | 'Demo';
  localeCode: string;          // BCP 47, e.g. "es-AR"
  countryCode: string;         // ISO 3166-1 alpha-2, e.g. "AR"
  currency: string;            // ISO 4217, e.g. "ARS" — debe ser siempre igual para mismo playerId
  balance: string;             // Balance actual, e.g. "100.00"
  lobbyUrl: string;            // URL del lobby del Operador
  depositUrl: string;          // URL de la página de depósito
  // Opcionales:
  promoBalance?: string;       // Balance de promo wallet, e.g. "50.00"
  exitUrl?: string;            // URL de redirección al cerrar el juego.
                               // Para iframe: "javascript:window.parent.location.href='{URL}'"
}
```

**Response (HTTP 201 Created):**
```typescript
{ gameStartUrl: string }  // URL única de sesión, cargar en iframe o webview
```

### 14.3 Consideraciones de implementación

- `playerId` que se envía al Provider es el `provider_player_id` del `UserProviderProfile`, **no** el `user.id` interno. Se debe buscar o crear el perfil antes de llamar a este endpoint.
- `balance` debe ser el `chip_balance` actual formateado con 2 decimales.
- `localeCode` default: `"es-AR"` para Argentina.
- La `gameStartUrl` resultante se devuelve al frontend para cargarla en un `<iframe>`.
- El token de sesión generado por el Provider expira por inactividad — se renueva con cada acción del jugador.

---

## 15. Frontend — postMessage desde el iframe *(rama futura)*

El iframe del juego puede enviar eventos al parent window para redirigir al jugador. El Operador debe escuchar dos formatos distintos según el game provider subyacente:

**Formato A (mayoría de providers):**
```typescript
window.addEventListener('message', (event: MessageEvent) => {
  const { type } = event.data;
  if (type === 'rgs-backToHome') {
    // Redirigir a lobbyUrl
  }
  if (type === 'rgs-deposit') {
    // Redirigir a depositUrl
  }
});
```

**Formato B (algunos providers):**
```typescript
window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data?.exi_fMessageType_str;
  if (msg === 'exi_onHomeUserAction') {
    // Redirigir a lobbyUrl
  }
  if (msg === 'exi_onCashierUserAction') {
    // Redirigir a depositUrl
  }
});
```

Ambos formatos deben manejarse en el componente del frontend que contiene el `<iframe>` del juego.
