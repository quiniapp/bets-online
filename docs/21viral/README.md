# 21Viral — Operator API v1.23 (referencia)

Copia local de la documentación oficial que entrega 21Viral, más un resumen accionable para esta
integración. **La fuente de verdad es el PDF**; este README solo destila lo que impacta en el código.

| Archivo | Qué es |
|---|---|
| [21Viral-Operator-API-v1.23.pdf](./21Viral-Operator-API-v1.23.pdf) | Documento original (68 páginas, clasificación "Public", 2026-09-29) |
| [operator-api-v1.23.full.txt](./operator-api-v1.23.full.txt) | Texto extraído con `pdftotext -layout`, para buscar/grep sin abrir el PDF |
| [../21viral-configuracion-operador.md](../21viral-configuracion-operador.md) | Qué configuramos nosotros vs. 21Viral, gap analysis y pedidos al account manager |

- **Versión:** 1.23 (2026-06-19), PDF exportado el 2026-09-29.
- **SHA-256 del PDF:** `3244b464488e5837d04f1b2e00d05e34c2ceb2c3841fa4480a462ac43d38f1b5`
- **Staging:** `https://api.stg.games-viral.com` (IPs del Provider: `75.2.84.22`, `35.71.154.198`).
- **Autenticación:** HMAC-SHA256 sobre el body canonicalizado RFC 8785; header
  `Authorization: HMAC-SHA256 <username>:<hex>`. Ver [../rfc8785-hmac-sha256.md](../rfc8785-hmac-sha256.md).
- **Formato:** todo es `POST` JSON; el Operator expone `/players/balance` y `/players/transactions`
  en la raíz de su base URL (no bajo `/api`).

## 1. Qué cambió desde la v1.20 (la que se usó para la guía de configuración)

| Versión | Cambio | Impacto acá |
|---|---|---|
| 1.21 | Mejor descripción de `OperatorGamesRequest` | Aclara el contrato: sync diario recomendado y comparación por `id` |
| 1.22 | Campo opcional `rtp` en la respuesta de `/v1/games` | ✅ Ya sincronizado (`viral.service.ts` → `games.rtp`) |
| 1.23 | Campo `hasFreeSpins` en la respuesta de `/v1/games` | ❌ No se persiste todavía (ver §5) |

`hasFreeSpins` **siempre viene** en la respuesta: `true` = soporta free spins, `false` = no, `null` =
aún no determinado. La columna/local modelling no existe en `games`, así que hoy se descarta.

## 2. Endpoints del documento

### Operator → Provider

| Endpoint | Uso | Notas |
|---|---|---|
| `POST /v1/games` | Catálogo de juegos | **Máx. 1 llamada/hora en producción**; recomiendan 1/día. Ordenado por `id` |
| `POST /v1/games/sessions` | Launch de juego | Devuelve `201` + `{ gameStartUrl }` |
| `POST /v1/jackpots/active` | Jackpots activos | Solo `providerName: "pragmatic"` |
| `POST /v1/jackpots/winners` | Ganadores de jackpot | `startTime`/`endTime` en **ms como string**; solo Pragmatic |
| `POST /v1/fsb/create` | Crear campaña Free Spins Bonus | `providerName` ∈ pragmatic, airdice, endorphina, habanero, playnetic |
| `POST /v1/fsb/cancel` | Cancelar campaña | Soft delete; después se puede reusar el `bonusId` |
| `POST /v1/fsb/player-bonus/create` | FSB para un jugador | `duration.type` debe ser `"DATE"` (segundos) |
| `POST /v1/fsb/player-bonus/list` | FSB activos de un jugador | Playnetic requiere `currency` |
| `POST /v1/fsb/players/add` | Agregar jugadores a campaña | Máx. 5000 `playerId` por llamada |
| `POST /v1/fsb/players/remove` | Quitar jugadores de campaña | — |
| `POST /v1/fsb/bet-scales/list` | Bet scales válidos por juego/moneda | Útil para construir UI de campañas |

Los FSB responden **HTTP 200 siempre**; el resultado viene en `{ error: "0" | código, description }`
(los códigos 1–12 y 1000 están en §7.7 del PDF). No confundir con el formato de error de la Operator
API (`viralErrorCode` + status HTTP). Ojo con los timestamps: en `/fsb/create` `startDate` va en
**milisegundos**; en `/fsb/player-bonus/create` todo va en **segundos**.

### Provider → Operator (callbacks)

| Endpoint | Uso |
|---|---|
| `POST {OPERATOR_BASE_API_URL}/players/balance` | Saldo (no es idempotente: cada request se procesa) |
| `POST {OPERATOR_BASE_API_URL}/players/transactions` | Debit / Credit / Reversal |

### Cliente (Pragmatic Live)

- Fullscreen: cargar `https://client.pragmaticplaylive.net/desktop/assets/api/fullscreenApi.js` y
  usar el iframe con `allowfullscreen`, `webkitallowfullscreen`, `mozallowfullscreen`.
- DGA (datos de mesas en vivo): `https://dga.pragmaticplaylive.net/dgaAPI.js` + WebSocket
  `wss://dga.pragmaticplaylive.net/ws`, Casino ID de producción `ppchx00000017566`.

## 3. Reglas de la API que condicionan el código

- **`gameId` está deprecado (v1.13/v1.20).** Todo se identifica con `providerName` + `providerGameId`
  en balance, transacciones y launch.
- **Idempotencia:** un `providerTransactionId` puede repetirse entre Debit/Credit/Reversal, así que la
  clave debe incluir `transactionType` (y conviene ronda/jugador/juego). La segunda request idéntica
  responde lo mismo con `alreadyProcessed: true` y no mueve saldo.
- **Reversal:** `providerTransactionId` es el id de la transacción a revertir y
  `betOutcomeEventData.reversalOfType` dice si se revierte un `Credit` o un `Debit`.
- **`gameRoundStatus`:** `Started`, `InProgress`, `None`, `Completed`, `Cancelled`. `Completed` awards
  el win y cierra la ronda; `Cancelled` marca rondas cerradas automáticamente por transacciones
  incompletas (~1 semana en slots/video poker).
- **`betType`:** `Cash`, `Promo`, `OperatorFreeSpinBonus`, `ProviderFreeSpinBonus`. Solo `Cash` está
  implementado; los otros tres requieren wallets/free spins que hoy no existen.
- **`cashBonusWins`** puede llegar sin `currency`; el código ya cae al `profile.currency`.
- **Moneda:** una sola moneda por `playerId`, para siempre; si no coincide → `CurrencyMismatch`.
- **Sync del catálogo:** comparar por `id`; si un juego ya no viene, hay que **deshabilitarlo/eliminarlo**
  (nuestro `syncGames()` solo hace upsert, no desactiva ausentes).
- **Límite de `/v1/games`:** 1/hora en producción → el cron diario de las 04:00 está bien; no subir la
  frecuencia sin coordinar.

## 4. Errores que devuelve el Operator (recordatorio)

`GeneralFailure`, `AuthenticationFailure`, `RequestValidationFailure`, `InsufficientFunds`,
`PlayerSelfExclusion`, `PlayerBlocked`, `PlayerFrozen`, `PlayerNotActive`, `LossLimitExceeded`,
`SpendLimitExceeded`, `GameDisabled`, `CurrencyMismatch`, `DoubleTransactionWithDifferentAmount`,
`RealMoneyNotAllowed`, `GameRoundNotFound` — con los HTTP status de §3.6. Los códigos ya están
tipados en `helper/src/types/provider.types.ts` (`ViralErrorCode`).

## 5. Estado en este repo

| Pieza | Estado |
|---|---|
| Launch (`/v1/games/sessions`) con Real/Demo, device, URLs, `exitUrl` | ✅ `gameLaunch.domain.ts` / `viral.service.ts` |
| Sync de catálogo diario con `rtp` | ✅ `gameLaunch.domain.ts` → `syncGames()` |
| `hasFreeSpins` (v1.23) | ❌ Se descarta: no hay columna en `games` ni uso en frontends |
| Desactivar juegos ausentes en el sync | ❌ Pendiente (hoy solo upsert) |
| Balance + transacciones + idempotencia + Reversal | ✅ `balance.domain.ts` / `transactions.domain.ts` |
| `betType` Promo / free spins del operador (`freeSpins`, `freeStake`) | ❌ Pendiente |
| Jackpot API | ❌ No integrado (opcional, solo Pragmatic) |
| Free Spin Bonus API | ❌ No integrada (el modelo actual solo contempla `betType`; no hay lógica de free spins) |
| DGA / fullscreen de Pragmatic Live | ❌ El iframe usa `allow="fullscreen"` pero no carga `fullscreenApi.js` ni DGA |
| postMessage lobby/cajero | ✅ `web/components/games/GameIframe.tsx` |

## 6. Próximos pasos sugeridos (si se retoma)

1. Migración + sync de `hasFreeSpins` para poder filtrar/badgear juegos con free spins.
2. Marcar `is_active = false` en los juegos que desaparecen del `/v1/games` (con cuidado: un fallo
   parcial de 21Viral no debería vaciar el lobby; desactivar solo si el listado vino completo).
3. Si se activan promos: implementar `Promo` / `OperatorFreeSpinBonus` y devolver `promoBalance`,
   `freeSpins`, `freeStake`.
4. Evaluar FSB API como alternativa a trackear free spins nosotros.
5. Si se suman juegos Live de Pragmatic: agregar `fullscreenApi.js` + atributos del iframe y evaluar DGA.
