# Cuentas corrientes y liquidaciones de cajeros

Guía funcional y técnica del módulo con el que el **propietario** entrega fichas
a sus cajeros, liquida lo que vendieron, cobra y ve su propio balance.

- **Backoffice:** `/admin/cashier-accounts` (menú **Finanzas**; `?tab=period|settlements|owner|bets`)
- **API:** `/api/cashier-accounts`
- **Rol habilitado:** `OWNER` (el cajero ve su historial en `/cashier/settlements`)
- **Migraciones:** `20261013000001-extend-cashier-settlements.js`,
  `20261122000001-settlements-chip-flow-and-collections.js`,
  `20261123000001-cashier-collections-on-account-and-pending.js`

---

## 1. Flujo de negocio

1. **Entrega de fichas.** A principio de la semana el owner le carga fichas al
   cajero (por ejemplo 1000) desde el panel de fichas (movimiento
   `SELL_TO_PLAYER` con el cajero como `user_id`).
2. **Venta de fichas.** El cajero se las vende a sus jugadores
   (`SELL_TO_PLAYER` con el cajero como `related_user_id`).
3. **Premios.** Si un jugador gana, el cajero le retira las fichas (`PRIZE`): las
   fichas vuelven al saldo del cajero y **el owner le paga el premio al jugador**.
4. **Cobros a cuenta.** Durante la semana el cajero le va pagando al owner en
   partes. El owner registra cada pago con el botón **Cobro**: se confirma al
   instante y se descuenta del total en la próxima liquidación.
5. **Liquidación.** El owner elige una **fecha de corte** (generalmente el
   sábado) y liquida a cada cajero desde su última liquidación (o desde su primer
   movimiento, si nunca se liquidó) hasta el corte. El inicio no se elige: así no
   quedan movimientos sin liquidar entre una liquidación y la siguiente.
   - fija el **cobro**: por defecto, la venta menos la comisión, más la deuda
     anterior, menos los cobros a cuenta. El cobro queda **pendiente** hasta que
     el owner confirma que el cajero pagó (**Confirmar cobro**); puede confirmar
     menos y la diferencia queda como deuda;
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
| **Saldo ant.** | Deuda (`debt_carried`) de la liquidación anterior del cajero. |
| **Total** | `saldo anterior + subtotal`. |
| **A cuenta** | Cobros a cuenta registrados desde la última liquidación. Se descuentan del total. |
| **Cobro** | Cobro de la liquidación. Editable; por defecto, `total − a cuenta`. Queda pendiente hasta que el owner lo confirma. |
| **Balance** | Fichas que tiene el cajero (incluye las de premios que se le van a retirar). |
| **No vendidas** | Fichas no vendidas que le quedan al cajero (`chips_left`). Editable; por defecto, todas (`balance − fichas de premios`). |

Fichas de premios a retirar = `min(premios, saldo del cajero)`.
Fichas no vendidas retiradas = `balance − fichas de premios − no vendidas que se dejan`.
Deuda que pasa a la próxima liquidación (`debt_carried`) = `total − cobrado confirmado`
(cobros a cuenta + lo confirmado del cobro de la liquidación). Negativo = saldo a favor del cajero.
Ganancia del owner por la liquidación = `subtotal − premios`.

Los importes se redondean a 2 decimales. Los juegos de proveedor (`GAME_*`) no
están atribuidos a un cajero y no entran en la cuenta.

El corte nunca pasa de "ahora": si se elige hoy, se liquida hasta el momento de
liquidar y lo que entre después va a la próxima liquidación. Las "no vendidas"
se calculan con el saldo **actual** del cajero, así que lo normal es liquidar
hasta hoy.

---

## 3. Backoffice

Cuatro pestañas:

1. **Liquidar** (principal): fecha de corte "Liquidar hasta" (por defecto hoy) y
   una fila por cajero con su período (desde su última liquidación), Entregadas,
   Venta de fichas, Premios, Comisión, Subtotal, Saldo ant., Total, A cuenta,
   **Cobro**, Balance, **No vendidas** y Estado. La tabla muestra los valores
   sugeridos de Cobro y No vendidas; se editan en la ventana que abre **Liquidar**.
   Acciones por fila: configurar comisión (%), ver la **cuenta corriente** del
   cajero (todos sus movimientos de fichas y de dinero), **Cobro** (registrar o
   anular cobros a cuenta) y **Liquidar**, o el comprobante si ya está liquidado
   hasta el corte; si el cobro de esa liquidación está pendiente, **Confirmar**.
   **Liquidar** abre una ventana con el detalle del cajero y los campos Cobro y
   No vendidas (con las fichas a retirar recalculadas al editar). **Liquidar todos** abre una ventana
   con una fila editable por cajero (Cobro y No vendidas) para los cajeros con ventas,
   premios, entregas o deuda (no los que solo tienen fichas no vendidas). **Resumen PDF** de todos los cajeros al corte.
2. **Historial de liquidaciones:** venta, premios, comisión, subtotal, cobrado,
   pendiente, debe y estado. **Confirmar cobro** confirma lo que el cajero pagó
   del cobro pendiente de su última liquidación. **Cancelar** anula la última liquidación del cajero y
   le devuelve las fichas retiradas.
3. **Cuenta del owner:** para un rango, ganancia (`subtotal − premios`), ingreso
   neto, premios pagados, caja neta (`cobrado − premios`), fichas entregadas y
   recuperadas; situación actual (deuda de cajeros, ventas sin liquidar, fichas en
   cajeros y en jugadores) y los movimientos (liquidaciones, premios, cobros).
   **Resumen PDF** descarga todo eso para el rango elegido, más un desglose por
   cajero (liquidaciones, caja y ganancia); pagina los movimientos si no entran.
4. **Apuestas:** el reporte de rondas (juegos nativos y de proveedores) con
   apostado, premios y balance de la casa. Es el mismo componente que
   `/admin/reports/bets`, que sigue disponible para los admins.

**Comisión al dar de alta.** Los formularios de alta de cajero y de
administrador tienen un campo opcional "Comisión (%)": se manda como
`commissionPercentage` en `POST /api/users` y crea la modalidad vigente en
`cashier_compensation_modes`. Para un jugador se rechaza con `400`. Por ahora las
liquidaciones solo usan la comisión de los cajeros; la del administrador queda
guardada.

Estados de una liquidación: `PAID` = cobrada (sin deuda), `PARTIALLY_PAID` =
cobro parcial, `PENDING` = sin cobrar, `CANCELED`. Mientras `pending_collection > 0`
la UI muestra "Cobro pendiente".

**Vista del cajero** (`/cashier/settlements`, menú "Mis liquidaciones"): sus
liquidaciones (venta, comisión, subtotal, saldo anterior, a cuenta, a pagar,
pagado, debe, fichas que le quedaron y estado) con el comprobante PDF, y los
cobros a cuenta que todavía no entraron en una liquidación. Solo lectura.

---

## 4. Modelo de datos

### `cashier_settlements`

Columnas originales: período, `total_sales`, `total_prizes_paid`, `profit`
(ahora `subtotal − premios`), `payable_amount` (ahora igual a la comisión),
`status`, `percentage`, `notes`, `created_by`, `paid_by`, `payment_reference`,
`paid_at`.

Columnas del flujo de fichas (null en liquidaciones del modelo anterior):
`commission`, `subtotal`, `previous_debt`, `total_due`, `collected`,
`debt_carried`, `on_account_collected`, `pending_collection`, `chips_delivered`, `chip_balance_before`,
`prize_chips_recovered`, `unsold_chips`, `chips_left`, `unsold_chips_recovered`.

### `cashier_collections`

Un registro por cobro. `kind`: `ON_ACCOUNT` (cobro a cuenta; `settlement_id`
null hasta que una liquidación lo descuenta) o `SETTLEMENT` (el cobro fijado al
liquidar). `status`: `CONFIRMED`, `PENDING` (cobro de liquidación sin confirmar),
`EXPIRED` (seguía pendiente cuando se liquidó de nuevo: pasó como deuda) o
`CANCELED`. Además `amount`, `payment_reference`, `notes`, `created_by`,
`created_at`, `confirmed_by`, `confirmed_at`. Al cancelar una liquidación sus
cobros a cuenta vuelven a quedar sin liquidar y los pendientes de la anterior
que habían vencido se reabren.

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
GET  /api/cashier-accounts/:cashierId/preview?periodEnd=
POST /api/cashier-accounts/:cashierId/settlements         # liquidar
GET  /api/cashier-accounts/period?periodEnd=              # cuenta corriente de todos los cajeros al corte
GET  /api/cashier-accounts/period/summary.pdf?periodEnd=
GET  /api/cashier-accounts/owner?periodStart=&periodEnd=  # cuenta del owner
GET  /api/cashier-accounts/owner/summary.pdf?periodStart=&periodEnd=
GET  /api/cashier-accounts/settlements?status=&cashierId=&search=
GET  /api/cashier-accounts/settlements/:id/receipt
POST /api/cashier-accounts/settlements/:id/confirm-collection  # { amount?, paymentReference? }
POST /api/cashier-accounts/settlements/:id/cancel         # { reason? }
GET  /api/cashier-accounts/:cashierId/collections         # cobros a cuenta sin liquidar
POST /api/cashier-accounts/:cashierId/collections         # { amount, paymentReference?, notes? }
POST /api/cashier-accounts/collections/:id/cancel         # anular un cobro a cuenta sin liquidar

# Rol CASHIER (su propio historial)
GET  /api/cashier-accounts/me/settlements?page=&limit=
GET  /api/cashier-accounts/me/settlements/:id/receipt
```

Body de liquidar:

```json
{
  "periodEnd": "2026-11-22T02:59:59.999Z",
  "collected": 700,
  "chipsLeft": 60,
  "paymentReference": "efectivo",
  "notes": "Semana 47"
}
```

El inicio lo calcula el servidor (`periodStart`, si llega, se ignora) y
`periodEnd` se recorta a ahora. `collected` (cobro pendiente) y `chipsLeft` son opcionales (por defecto:
`total − a cuenta` y todas las no vendidas). La operación corre en una transacción con lock sobre el saldo del
cajero.

Se eliminaron `POST /settlements/:id/pay` (el owner ya no le paga comisión al
cajero: el cajero la retiene) y los endpoints `/daily/*`.

---

## 6. Reglas

- Solo el owner, y solo sobre cajeros de su árbol.
- Hace falta comisión configurada para el período.
- Cada liquidación empieza justo después de la anterior (o en el primer
  movimiento del cajero): no hay huecos ni superposiciones. Si el cajero ya está
  liquidado hasta el corte, se rechaza con `409`.
- El deje no puede superar las fichas no vendidas.
- Confirmar cobro y cancelar: solo sobre la **última** liquidación del cajero.
  Si se liquida de nuevo con un cobro pendiente, ese cobro vence y pasa como deuda.
- Un cobro a cuenta solo se puede anular mientras no se haya liquidado.
- Auditoría: `cashier-accounts.compensation.update`,
  `cashier-accounts.settlement.create`, `cashier-accounts.settlement.confirm-collection`,
  `cashier-accounts.settlement.cancel`, `cashier-accounts.collection.create`,
  `cashier-accounts.collection.cancel`.

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
  `web-admin/components/admin/cashier-settlement-dialog.tsx`,
  `web-admin/components/admin/cashier-collection-dialog.tsx`,
  `web-admin/components/admin/confirm-collection-dialog.tsx`,
  `web-admin/app/cashier/settlements/page.tsx`,
  `web-admin/components/admin/owner-account.tsx`,
  `web-admin/hooks/useCashierPeriodAccounts.ts`
- Tests: `api/tests/domain/cashier-accounts.domain.test.ts`,
  `api/tests/utils/settlement-receipt.test.ts`
