# 21Viral — Guía de configuraciones del Operador

> Basado en **21Viral Operator API v1.20** (2026-02-14) y en la integración existente en
> `api/src/features/integrations/21viral/`.

## 1. Concepto clave: qué se configura dónde

La Operator API **no tiene endpoints de configuración**. Es una API transaccional (launch, balance,
débitos/créditos). Las configuraciones se reparten en tres lugares:

| Configuración | ¿Dónde se setea? | Mecanismo |
|---|---|---|
| Apuesta mínima / máxima por juego | **21Viral (Provider)** | Solicitud al account manager. La API no lo expone |
| Límites de pérdida / gasto del jugador | **Nuestro backend (Operador)** | Rechazar débitos con error `422` (`LossLimitExceeded`, `SpendLimitExceeded`) |
| Bonus / promo wallet | **Ambos** | Campos `promoBalance`, `freeSpins`, `freeStake` + habilitación por juego del lado 21Viral |
| Calidad gráfica del juego | **Ninguno (no existe en la API)** | La maneja el cliente del juego; ver §5 |
| Modo Real / Demo | **Operador por sesión** + habilitación 21Viral | Campo `gameMode` en el launch |
| Idioma / región / moneda | **Operador por sesión** | `localeCode`, `countryCode`, `currency` en el launch |
| Deshabilitar un juego | **Operador** | Error `GameDisabled` + flag local `games.is_active` |
| URLs de retorno (lobby, depósito, salida) | **Operador por sesión** | `lobbyUrl`, `depositUrl`, `exitUrl` + eventos `postMessage` |
| RTP, volatilidad, demo disponible por juego | **21Viral (Provider)** | "Complete games configuration" — documentación separada que entrega 21Viral (§2 del PDF) |

Cita del PDF (§2): *"Beside basic game information which is available through Provider API, complete
games configuration can be provided as separate documentation."* — es decir, los parámetros de los
juegos (límites de mesa, RTP, etc.) se piden a 21Viral, no se setean por API.

---

## 2. Limitar apuesta mínima y máxima

### 2.1 Límites por juego (los que muestra la UI del juego)

Los valores de apuesta que ofrece el juego (chips, niveles de bet, etc.) los configura **21Viral por
operador/moneda**. Pasos:

1. Pedir al account manager de 21Viral la **"games configuration"** (documento separado al Operator API).
2. Indicar por juego (`providerName` + `providerGameId`) y por moneda (`ARS`): bet mínimo, bet máximo
   y, si aplica, win máximo.
3. 21Viral aplica la configuración en su plataforma; el juego pasa a ofrecer solo bets dentro del rango.
4. Verificar en staging (`api.stg.games-viral.com`) lanzando el juego y revisando los montos de
   `ProviderTransactionRequest` tipo `Debit` que llegan a `/players/transactions`.

> Importante: desde v1.20 `gameId` está deprecado; todo se identifica con `providerName` +
> `providerGameId`.

### 2.2 Límites del lado nuestro (red de seguridad / límites responsables)

Independientemente de lo que configure 21Viral, nosotros podemos **rechazar cualquier débito** que viole
nuestras reglas. El PDF (§3.6) define los errores que el juego entiende; todos responden HTTP `422` con:

```json
{
  "viralErrorCode": "SpendLimitExceeded",
  "message": "Bet exceeds the maximum allowed for this player"
}
```

Códigos relevantes (ya tipados en `helper/src/types/provider.types.ts` → `ViralErrorCode`):

| Código | Cuándo usarlo |
|---|---|
| `InsufficientFunds` | Saldo insuficiente (ya implementado) |
| `SpendLimitExceeded` | Bet individual o gasto acumulado supera el máximo definido por nosotros |
| `LossLimitExceeded` | Pérdida acumulada del jugador supera su límite (juego responsable) |
| `GameDisabled` | Juego deshabilitado por nosotros |
| `PlayerSelfExclusion` / `PlayerFrozen` | Estados de autoexclusión / congelado |

Pasos de implementación en nuestro backend:

1. Agregar campos de límite donde corresponda (p. ej. `users` o una tabla `player_limits`):
   `max_bet`, `daily_spend_limit`, `daily_loss_limit`.
2. En `transactions.domain.ts` (`executeTransaction`), antes de descontar un `Debit`:
   - si `amount > max_bet` → `throw new ViralError(ViralErrorCode.SpendLimitExceeded, ...)`
   - si gasto acumulado del día + `amount > daily_spend_limit` → `SpendLimitExceeded`
   - si pérdida acumulada > `daily_loss_limit` → `LossLimitExceeded`
3. No aplicar límites a `Credit` ni `Reversal` (solo bloquean apuestas nuevas, nunca pagos).
4. El juego mostrará al jugador el mensaje de error del proveedor y la ronda no se abre.

> Nota: esto **no cambia los montos que ofrece la UI del juego** (eso es §2.1); solo impide que la
> apuesta se concrete. Para una buena UX conviene combinar ambos: límites de mesa en 21Viral + límites
> por jugador en nuestro lado.

---

## 3. Bonus / promo

La API soporta cuatro tipos de ronda (§3.2):

1. **Cash** — apuesta con dinero real (lo único implementado hoy).
2. **Promo** — apuesta pagada con saldo promocional **nuestro** (requiere que soportemos promo wallet).
3. **OperatorFreeSpinBonus** — free spins otorgados y trackeados **por nosotros** (`freeSpins` + `freeStake`).
4. **ProviderFreeSpinBonus** — free spins otorgados y trackeados **por 21Viral** (campañas del provider).

### 3.1 Promo wallet (saldo de bonus)

Campos involucrados (todos opcionales, string decimal `"50.00"`):

- `promoBalance` en el **launch** (`OperatorStartGameUrlRequest`).
- `promoBalance` en la respuesta de **`/players/balance`**.
- `promoBalance` y `promo` en la respuesta de **`/players/transactions`** (`promo` = cuánto del bet
  Cash se pagó con saldo promo).
- Regla del PDF (§3.1): si hay múltiples wallets, `balance` siempre es el **total agregado** de todas.

Pasos para habilitarlo:

1. Confirmar con 21Viral qué juegos soportan bets `Promo` (depende del juego subyacente).
2. Crear wallet promocional en nuestro sistema (p. ej. columna `promo_balance` en `balances`).
3. Incluir `promoBalance` en `viral.service.ts → createGameSession` y en la respuesta de
   `balance.domain.ts → getBalance`.
4. En `transactions.domain.ts`, manejar `betType: 'Promo'`: debitar del wallet promo en lugar del real,
   y devolver `promoBalance` actualizado. Decidir política de wins sobre bets promo (¿van a real o a promo?)
   y acordarla con 21Viral.

### 3.2 Free spins del Operador (`OperatorFreeSpinBonus`)

1. Confirmar con 21Viral qué juegos soportan free spins del operador.
2. Persistir asignaciones por jugador: cantidad (`freeSpins`, integer) y valor por spin (`freeStake`,
   string en la moneda del jugador — obligatorio si `freeSpins` viene).
3. Devolver ambos campos en `/players/balance` y en cada respuesta de `/players/transactions`
   (el contador va decreciendo a medida que se consumen).
4. Los débitos de esas rondas llegan con `betType: 'OperatorFreeSpinBonus'` → no descontar saldo real;
   descontar un free spin.

### 3.3 Free spins del Provider y premios especiales

- `ProviderFreeSpinBonus`: campañas configuradas por 21Viral. Solo hay que **aceptar el `betType`** y
  registrar la ronda (no se descuenta saldo nuestro). Se piden/configuran vía account manager.
- `betOutcomeEventData` en créditos puede traer `jackpotWins`, `tournamentWins`, `campaignWins`,
  `cashBonusWins` (puede venir **más de un tipo en la misma transacción**). El campo `amount` del
  request padre ya viene agregado; los items detallan cada premio. Hoy lo persistimos crudo en
  `provider_transactions.bet_outcome_event_data` — para reporting de campañas habría que parsearlo.
- Ojo: en `cashBonusWins` el request **puede venir sin `currency`** (§3.3); nuestro código ya hace
  fallback a `profile.currency`.

---

## 4. Modo Real / Demo

- Se elige **por sesión** en el launch: `gameMode: "Real" | "Demo"` (ya soportado en
  `gameLaunch.domain.ts → LaunchGameParams`).
- La disponibilidad de Demo **por juego la define 21Viral**: *"Provider will provide separately where
  Demo mode is available"* (§2.3). Pedir la lista al account manager.
- Error asociado: `RealMoneyNotAllowed` (422) cuando el juego solo soporta demo.

---

## 5. "Calidad" del juego

**La Operator API v1.20 no expone ninguna configuración de calidad gráfica/streaming.** No hay campo ni
endpoint para eso. En la práctica:

- La calidad gráfica la maneja el **cliente del juego** (auto-detección de dispositivo/red y, en muchos
  juegos, un menú de ajustes dentro del propio juego).
- Lo único que influye desde nuestro lado es `playerDeviceType: "Desktop" | "Mobile"` en el launch,
  que ya enviamos — el provider sirve el build adecuado al dispositivo.
- Si se necesita forzar calidad por defecto, assets más livianos, u opciones específicas de algún
  proveedor subyacente (Pragmatic, etc.), hay que **pedirlo a 21Viral** como parte de la games
  configuration; no es algo configurable por API.

---

## 6. Otras configuraciones disponibles

### 6.1 Idioma, región y moneda (por sesión de launch)

| Campo | Formato | Hoy enviamos |
|---|---|---|
| `localeCode` | BCP 47 `{ISO 639-1}-{ISO 3166-1}` (ej. `es-AR`) | `es-AR` hardcodeado |
| `countryCode` | ISO 3166-1 alpha-2 (ej. `AR`) | del perfil (`AR`) |
| `currency` | ISO 4217. **Una sola moneda por `playerId`, para siempre** | `ARS` |

Restricción dura del PDF: múltiples monedas por jugador **no están permitidas** (`CurrencyMismatch` si
no coincide). Cambiar la moneda de un jugador existente requiere coordinación con 21Viral.

### 6.2 Habilitar / deshabilitar juegos

- Local: flag `is_active` en nuestra tabla `games` (ya existe) controla qué se muestra en el lobby.
- Enforcement: si llega un `Debit` de un juego deshabilitado, responder `GameDisabled` (422).
  Hoy **no** se valida en `transactions.domain.ts` — agregar el check contra `games.is_active` usando
  `providerGameId`/`currentProviderGameId`.

### 6.3 URLs de navegación y cierre del juego

En el launch (todos ya soportados):

- `lobbyUrl` (requerido) — adónde vuelve el jugador.
- `depositUrl` (requerido) — página de cajero/depósito.
- `exitUrl` (opcional) — redirección al cerrar el juego. Para iframe usar el formato:
  `javascript:window.parent.location.href='{URL}'`.

Además el frontend debe escuchar `postMessage` del iframe (§4.1) — dos formatos según el proveedor
subyacente:

```ts
window.addEventListener('message', (event: MessageEvent) => {
  const { type, exi_fMessageType_str } = event.data ?? {};
  if (type === 'rgs-backToHome' || exi_fMessageType_str === 'exi_onHomeUserAction') {
    // redirigir al lobby
  }
  if (type === 'rgs-deposit' || exi_fMessageType_str === 'exi_onCashierUserAction') {
    // redirigir al cajero
  }
});
```

### 6.4 Estados del jugador

Mapear estados de cuenta a errores 422 en balance y transacciones:

- `PlayerBlocked` (ya implementado para `status === 'BLOCKED'`)
- `PlayerNotActive` (ya implementado)
- `PlayerFrozen`, `PlayerSelfExclusion` (tipados, sin uso — implementar si agregamos esos estados)

### 6.5 Sincronización del catálogo de juegos

- `POST /v1/games` (`OperatorGamesRequest`) — **máximo 1 llamada por hora en producción** (límite
  agregado en v1.10). Nuestro `syncGames()` debe respetarlo (no ponerlo en un cron más frecuente).

### 6.6 Rondas canceladas automáticamente

`gameRoundStatus: "Canceled"` (v1.13): 21Viral cierra automáticamente rondas incompletas (bets sin
win/loss tras ~1 semana en Slots/VideoPoker). Llegan como transacciones normales — ya las persistimos
con su `gameRoundStatus`.

### 6.7 Jackpots (solo Pragmatic Play)

Endpoints opcionales para mostrar jackpots en el lobby (§5):

- `POST /v1/jackpots/active` — jackpots activos (filtro opcional por `currency`).
- `POST /v1/jackpots/winners` — ganadores en un rango (`startTime`/`endTime` en **milisegundos** como string).
- Misma autenticación HMAC. Solo `providerName: "pragmatic"`; otros providers devuelven vacío/error.
- Los premios de jackpot también llegan como `Credit` con `betOutcomeEventData.jackpotWins`
  (`type: "Jackpot" | "GlobalJackpot"`), y el `token` puede ser opcional en esos créditos.

### 6.8 Seguridad / ambientes (recordatorio)

- HMAC-SHA256 sobre el body canonicalizado RFC 8785 (ver `docs/rfc8785-hmac-sha256.md`), header
  `Authorization: HMAC-SHA256 <username>:<firma hex>`.
- Credenciales (username + shared secret) **distintas por ambiente** (staging / producción) — las
  entrega 21Viral, junto con las IPs a whitelistear. Staging: `75.2.84.22` y `35.71.154.198`.
- Base URL staging: `https://api.stg.games-viral.com`.

---

## 7. Estado actual vs. pendientes (gap analysis)

| Configuración | Estado en `bets-online` |
|---|---|
| Launch con Real/Demo, device, URLs, exitUrl | ✅ Implementado (`gameLaunch.domain.ts`) |
| Balance + transacciones con idempotencia | ✅ Implementado (`transactions.domain.ts`) |
| Errores `InsufficientFunds`, `PlayerBlocked`, `PlayerNotActive`, `CurrencyMismatch`, `GameRoundNotFound`, `DoubleTransactionWithDifferentAmount` | ✅ Implementado |
| Límite de bet máx/mín por jugador (`SpendLimitExceeded`) | ❌ Pendiente — §2.2 |
| Límite de pérdida (`LossLimitExceeded`) | ❌ Pendiente — §2.2 |
| Check `GameDisabled` en transacciones | ❌ Pendiente — §6.2 |
| Promo wallet (`promoBalance`, betType `Promo`) | ❌ Pendiente — §3.1 |
| Free spins del operador (`freeSpins`/`freeStake`) | ❌ Pendiente — §3.2 |
| `localeCode` dinámico por jugador | ❌ Hardcodeado `es-AR` |
| postMessage fallback en frontend (lobby/cajero) | ✅ Implementado (`web/components/games/GameIframe.tsx`) |
| Jackpot API (Pragmatic) | ❌ No integrado (opcional) |

## 8. Checklist de pedidos al account manager de 21Viral

- [ ] **Games configuration** completa por juego/moneda: bet mín/máx, win máx, RTP disponible.
- [ ] Ajuste de límites de mesa para `ARS` (valores que pidamos).
- [ ] Lista de juegos con **Demo** disponible.
- [ ] Lista de juegos que soportan **bets Promo** y **OperatorFreeSpinBonus**.
- [ ] Alta de campañas **ProviderFreeSpinBonus** (si se quieren usar).
- [ ] Opciones de calidad/assets si algún proveedor subyacente lo permite (no hay API para esto).
- [ ] Credenciales y whitelist de IPs por ambiente (si falta producción).
