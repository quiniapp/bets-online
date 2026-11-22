# Cuentas corrientes y liquidaciones de cajeros

Guía funcional y técnica del módulo con el que el **propietario** entrega fichas
a sus cajeros, liquida lo que vendieron, cobra y ve su propio balance.

- **Backoffice:** `/admin/cashier-accounts`
- **API:** `/api/cashier-accounts`
- **Rol habilitado:** `OWNER`
- **Migraciones:** `20261013000001-extend-cashier-settlements.js`,
  `20261122000001-settlements-chip-flow-and-collections.js`

---

## 1. Flujo de negocio

1. **Entrega de fichas.** A principio de la semana el owner le carga fichas al
   cajero (por ejemplo 1000) desde el panel de fichas (movimiento
   `SELL_TO_PLAYER` con el cajero como `user_id`).
2. **Venta de fichas.** El cajero se las vende a sus jugadores
   (`SELL_TO_PLAYER` con el cajero como `related_user_id`).
3. **Premios.** Si un jugador gana, el cajero le retira las fichas (`PRIZE`): las
   fichas vuelven al saldo del cajero y **el owner le paga el premio al jugador**.
4. **Liquidación.** Al cierre del período (generalmente los sábados, pero el
   período es libre) el owner liquida a cada cajero:
   - **cobra** la venta de fichas menos la comisión del cajero (puede cobrar
     parcial: lo que falta queda como deuda para la liquidación siguiente);
   - le **retira las fichas de premios**;
   - de las **fichas no vendidas**, decide cuántas le **deja** (saldo pendiente
     para la semana siguiente) y el resto se le retira.

Ejemplo: entrega 1000, vende 900, comisión 20% → comisión 180, **subtotal 720**
(lo que se cobra) y quedan 100 fichas no vendidas que se le pueden dejar.

---

## 2. Glosario y fórmulas

| Concepto (columna) | Cálculo |
|---|---|
| **Entregadas** | Σ `SELL_TO_PLAYER` al cajero en el período (cargas del owner). Informativo. |
| **Venta de fichas** | Σ `SELL_TO_PLAYER` del cajero a jugadores en el período. |
| **Premios** | Σ `−amount` de `PRIZE` operados por el cajero en el período. |
| **Comisión** | `venta × % / 100`, con el % vigente al cierre del período. |
| **Subtotal** | `venta − comisión`. Lo que el cajero le debe al owner por el período. |
| **Saldo ant.** | Arrastre (deuda) de la liquidación anterior del cajero. |
| **Total** | `saldo anterior + subtotal`. |
| **Cobro** | Lo que el owner cobra al liquidar. Editable; por defecto, el total. |
| **Arrastre** | `total − cobro`. Pasa como saldo anterior a la próxima liquidación. Negativo = saldo a favor del cajero. |
| **No vendidas** | `fichas del cajero − fichas de premios a retirar`. |
| **Deje** | Fichas no vendidas que le quedan al cajero. Editable; por defecto, todas. |

Fichas de premios a retirar = `min(premios, saldo del cajero)`.
Fichas no vendidas retiradas = `no vendidas − deje`.
Ganancia del owner por la liquidación = `subtotal − premios`.

Los importes se redondean a 2 decimales. Los juegos de proveedor (`GAME_*`) no
están atribuidos a un cajero y no entran en la cuenta.

Las "no vendidas" se calculan con el saldo **actual** del cajero, así que lo
normal es liquidar hasta hoy. Si se liquida un período viejo, ese saldo incluye
lo que pasó después.

---

## 3. Backoffice

Cuatro pestañas:

1. **Cuenta corriente** (principal): rango Desde/Hasta (por defecto la semana en
   curso, domingo a hoy) y una fila por cajero con Entregadas, Venta de fichas,
   Premios, Comisión, Subtotal, Saldo ant., Total, **Cobro**, Arrastre, No
   vendidas, **Deje**, Estado. Cobro y Deje se editan en la fila. Botones
   **Liquidar** por cajero, **Liquidar todos** (solo cajeros con actividad y
   comisión configurada) y **Resumen PDF**. Las filas ya liquidadas muestran los
   valores guardados y el comprobante. Si hay un hueco sin liquidar entre la
   última liquidación y el inicio del rango, la fila lo avisa.
2. **Cuentas de cajeros:** situación actual de cada cajero (fichas, venta y
   premios sin liquidar, deuda arrastrada, total a cobrar), configurar comisión,
   liquidar desde un diálogo y ver la **cuenta corriente** del cajero: todos los
   movimientos de fichas (entregas, ventas, premios, retiros de liquidación) y de
   dinero (subtotal de cada liquidación y cobros).
3. **Liquidaciones:** historial con venta, premios, comisión, subtotal, cobrado,
   arrastre y estado. **Cobrar** registra un cobro posterior sobre la última
   liquidación del cajero. **Cancelar** anula la última liquidación del cajero y
   le devuelve las fichas retiradas.
4. **Cuenta del owner:** para un rango, ganancia (`subtotal − premios`), ingreso
   neto, premios pagados, caja neta (`cobrado − premios`), fichas entregadas y
   recuperadas; situación actual (deuda de cajeros, ventas sin liquidar, fichas en
   cajeros y en jugadores) y los movimientos (liquidaciones, premios, cobros).

Estados de una liquidación: `PAID` = cobrada (sin deuda), `PARTIALLY_PAID` =
cobro parcial, `PENDING` = sin cobrar, `CANCELED`.

---

## 4. Modelo de datos

### `cashier_settlements`

Columnas originales: período, `total_sales`, `total_prizes_paid`, `profit`
(ahora `subtotal − premios`), `payable_amount` (ahora igual a la comisión),
`status`, `percentage`, `notes`, `created_by`, `paid_by`, `payment_reference`,
`paid_at`.

Columnas del flujo de fichas (null en liquidaciones del modelo anterior):
`commission`, `subtotal`, `previous_debt`, `total_due`, `collected`,
`debt_carried`, `chips_delivered`, `chip_balance_before`,
`prize_chips_recovered`, `unsold_chips`, `chips_left`, `unsold_chips_recovered`.

### `cashier_collections`

Un registro por cobro: el inicial de la liquidación y los posteriores.
`settlement_id`, `cashier_id`, `amount`, `payment_reference`, `created_by`,
`created_at`. Los cobros de liquidaciones canceladas no cuentan.

### Movimientos de fichas de una liquidación

Se registran en `chip_movements` sobre el cajero, con el owner como
`related_user_id`, y se vinculan a la liquidación por `idempotency_key`:

| Key | Tipo | Efecto |
|---|---|---|
| `settlement:<id>:prizes` | `RECOVERY` | Retiro de fichas de premios |
| `settlement:<id>:unsold` | `RECOVERY` | Retiro de fichas no vendidas |
| `settlement:<id>:reversal` | `ADJUSTMENT` | Devolución al cancelar |

### Legado

`cashier_current_accounts` (cuenta diaria) queda sin uso: ni la API ni la UI la
leen. Se puede eliminar con una migración cuando ya no haga falta su historial.

---

## 5. API

Todas requieren sesión y rol `OWNER`; las mutaciones, `x-csrf-token`.

```http
GET  /api/cashier-accounts?page=&limit=&search=          # cuentas de cajeros + resumen
GET  /api/cashier-accounts/:cashierId                     # cuenta corriente del cajero
PUT  /api/cashier-accounts/:cashierId/compensation        # { type: "PERCENTAGE", percentage }
GET  /api/cashier-accounts/:cashierId/preview?periodStart=&periodEnd=
POST /api/cashier-accounts/:cashierId/settlements         # liquidar
GET  /api/cashier-accounts/period?periodStart=&periodEnd= # cuenta corriente de todos los cajeros
GET  /api/cashier-accounts/period/summary.pdf?periodStart=&periodEnd=
GET  /api/cashier-accounts/owner?periodStart=&periodEnd=  # cuenta del owner
GET  /api/cashier-accounts/settlements?status=&cashierId=&search=
GET  /api/cashier-accounts/settlements/:id/receipt
POST /api/cashier-accounts/settlements/:id/collect        # { amount, paymentReference?, notes? }
POST /api/cashier-accounts/settlements/:id/cancel         # { reason? }
```

Body de liquidar:

```json
{
  "periodStart": "2026-11-15T03:00:00.000Z",
  "periodEnd": "2026-11-22T02:59:59.999Z",
  "collected": 700,
  "chipsLeft": 60,
  "paymentReference": "efectivo",
  "notes": "Semana 47"
}
```

`collected` y `chipsLeft` son opcionales (por defecto: total y todas las no
vendidas). La operación corre en una transacción con lock sobre el saldo del
cajero.

Se eliminaron `POST /settlements/:id/pay` (el owner ya no le paga comisión al
cajero: el cajero la retiene) y los endpoints `/daily/*`.

---

## 6. Reglas

- Solo el owner, y solo sobre cajeros de su árbol.
- Hace falta comisión configurada para el período.
- No se superponen liquidaciones no canceladas de un cajero, y un período nuevo
  tiene que empezar después de la última liquidación.
- El deje no puede superar las fichas no vendidas.
- Cobros posteriores y cancelaciones: solo sobre la **última** liquidación del
  cajero (en las anteriores el saldo ya se arrastró).
- Auditoría: `cashier-accounts.compensation.update`,
  `cashier-accounts.settlement.create`, `cashier-accounts.settlement.collect`,
  `cashier-accounts.settlement.cancel`.

---

## 7. Operación

```bash
APP_ENV=production pnpm --filter api db:migrate
pnpm --filter helper build
pnpm --filter api test -- tests/domain/cashier-accounts.domain.test.ts tests/utils/settlement-receipt.test.ts
```

---

## 8. Referencias de código

- Dominio: `api/src/features/cashier-accounts/cashier-accounts.domain.ts`
- Repositorio: `api/src/features/cashier-accounts/cashier-accounts.repository.ts`
- Modelos: `api/src/features/chips/cashier-settlement.model.ts`,
  `api/src/features/cashier-accounts/cashier-collection.model.ts`
- PDFs: `api/src/utils/settlement-receipt.utils.ts`
- Tipos y validadores: `helper/src/types/models.types.ts`,
  `helper/src/validators/cashier-account.validator.ts`
- Backoffice: `web-admin/app/admin/cashier-accounts/page.tsx`,
  `web-admin/components/admin/cashier-period-accounts.tsx`,
  `web-admin/components/admin/owner-account.tsx`,
  `web-admin/hooks/useCashierPeriodAccounts.ts`
- Tests: `api/tests/domain/cashier-accounts.domain.test.ts`,
  `api/tests/utils/settlement-receipt.test.ts`
