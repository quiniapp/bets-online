# Cuentas corrientes y liquidaciones de cajeros

Guía funcional y técnica del módulo con el que cada **administrador** (y el
owner, para los cajeros que tiene a cargo) entrega fichas a sus cajeros, liquida
lo que vendieron, cobra y ve su propio balance; y del sistema con el que el
**owner le vende fichas a los admins** a precio diferencial.

**Jerarquía de liquidación:**

- **Admin → sus cajeros:** el sistema de liquidaciones de este documento
  (secciones 1 a 8). Cada uno liquida solo a sus cajeros **directos**
  (`parent_user_id`).
- **Owner → cajeros a su cargo:** el mismo sistema, como si fuera su admin.
- **Owner → admins:** compra de fichas a precio diferencial (sección 9).

- **Backoffice:** `/admin/cashier-accounts` (menú **Finanzas** del owner y del admin;
  `?tab=period|settlements|owner|admins|purchases|bets`)
- **API:** `/api/cashier-accounts` (owner y admin), `/api/admin-chip-purchases` (owner),
  `/api/admin-chip-purchases/me` (admin)
- **Roles:** `OWNER` y `ADMIN` (el cajero ve su historial en `/cashier/settlements`)
- **Migraciones:** `20261013000001-extend-cashier-settlements.js`,
  `20261122000001-settlements-chip-flow-and-collections.js`,
  `20261123000001-cashier-collections-on-account-and-pending.js`,
  `20261124000001-admin-settlements-and-chip-purchases.js`

En el resto del documento, "el que liquida" es el admin (o el owner con sus
cajeros directos).

---

## 1. Flujo de negocio

1. **Entrega de fichas.** A principio de la semana el owner le carga fichas al
   cajero (por ejemplo 1000) desde el panel de fichas (movimiento
   `SELL_TO_PLAYER` con el cajero como `user_id`).
2. **Venta de fichas.** El cajero se las vende a sus jugadores
   (`SELL_TO_PLAYER` con el cajero como `related_user_id`).
3. **Premios.** Si un jugador gana, el cajero le retira las fichas (`PRIZE`): las
   fichas vuelven al saldo del cajero. Por cajero, el que liquida elige si **los
   premios afectan el subtotal**: si no, él le paga el premio al jugador; si sí,
   lo paga el cajero y se descuenta del subtotal.
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
| **Balance** | Fichas que tiene el cajero (incluye las de premios que se le van a retirar). |
| **Venta de fichas** | Σ `SELL_TO_PLAYER` del cajero a jugadores en el período. |
| **Premios** | Σ `−amount` de `PRIZE` operados por el cajero en el período. |
| **Comisión** | `venta × % / 100`, con el % vigente al cierre del período. |
| **Subtotal** | `venta − comisión`, o `venta − comisión − premios` si el cajero tiene "los premios afectan el subtotal" (marca **P**). Lo que el cajero debe por el período. |
| **Saldo ant.** | Deuda (`debt_carried`) de la liquidación anterior del cajero. |
| **Cobro** | Cobros a cuenta registrados desde la última liquidación. |
| **Total** | `saldo anterior + subtotal − cobro`: lo que queda por cobrar. |

Al liquidar (en la ventana de **Liquidar**, ya no en la tabla) se fijan:

- **Cobro de la liquidación:** editable; por defecto, el Total. Queda pendiente
  hasta que el que liquida lo confirma.
- **No vendidas** (`chips_left`): fichas no vendidas que le quedan al cajero.
  Editable; por defecto, todas (`balance − fichas de premios`).

Fichas de premios a retirar = `min(premios, saldo del cajero)`.
Fichas no vendidas retiradas = `balance − fichas de premios − no vendidas que se dejan`.
Deuda que pasa a la próxima liquidación (`debt_carried`) = `total − cobrado confirmado`
(cobros a cuenta + lo confirmado del cobro de la liquidación). Negativo = saldo a favor del cajero.
Ganancia del que liquida = `subtotal − premios` (o `subtotal` si los premios se
descontaron del subtotal: los pagó el cajero).
Las fichas que se le retiran al cajero (premios y no vendidas) **vuelven al
saldo del admin** que liquida; si liquida el owner, no van a ningún saldo (el
owner no tiene límite). Al cancelar la liquidación se le descuentan al admin y
se le devuelven al cajero (si el admin ya no las tiene, no se puede cancelar).

Los importes se redondean a 2 decimales. Los juegos de proveedor (`GAME_*`) no
están atribuidos a un cajero y no entran en la cuenta.

El corte nunca pasa de "ahora": si se elige hoy, se liquida hasta el momento de
liquidar y lo que entre después va a la próxima liquidación. Las "no vendidas"
se calculan con el saldo **actual** del cajero, así que lo normal es liquidar
hasta hoy.

---

## 3. Backoffice

Pestañas:

1. **Liquidar** (principal): fecha de corte "Liquidar hasta" (por defecto hoy) y
   una fila por cajero con su período (desde su última liquidación), **Balance**,
   Venta de fichas, Premios, Comisión, Subtotal, Saldo ant., **Cobro** y **Total**.
   Sobre el Total de una fila liquidada, un tooltip muestra el cobro fijado y si
   está pendiente.
   Acciones por fila: configurar comisión (%) y si los premios afectan el
   subtotal, **Cobro** (registrar o anular cobros a cuenta), el comprobante si ya
   está liquidado hasta el corte y, si el cobro de esa liquidación está
   pendiente, **Confirmar**. La **cuenta corriente** del cajero se abre con un
   clic en su nombre. No hay liquidación individual: **Liquidar todos** abre una
   ventana con una fila editable por cajero (Cobro y No vendidas) para los
   cajeros con ventas, premios, entregas o deuda (no los que solo tienen fichas no
   vendidas); si hay uno solo, la ventana muestra su detalle. **Exportar diario**
   descarga el PDF "Casino - Parte diario" de todos los cajeros al corte, y
   **Exportar liquidaciones** un .zip con el comprobante de la última liquidación
   (no cancelada) de cada cajero. El switch **Premios en todos** (al lado de
   Actualizar) activa o desactiva, con confirmación, en todos los cajeros con
   comisión que los premios se descuenten del subtotal, manteniendo su %; los que
   no tienen comisión no se tocan. Está encendido si todos lo tienen activo.
   Debajo del nombre, junto al %, los cajeros con premios en el subtotal (según
   su configuración vigente) muestran **Premio** en lugar de la fecha.
2. **Historial de liquidaciones:** venta, premios, comisión, subtotal, cobrado,
   pendiente, debe y estado. **Confirmar cobro** confirma lo que el cajero pagó
   del cobro pendiente de su última liquidación. **Cancelar** anula la última liquidación del cajero y
   le devuelve las fichas retiradas.
3. **Cuenta del owner** (para el admin, **Mi cuenta**): sobre los cajeros
   directos del que consulta. Para un rango, ganancia (`subtotal − premios`), ingreso
   neto, premios pagados, caja neta (`cobrado − premios`), fichas entregadas y
   recuperadas; situación actual (deuda de cajeros, ventas sin liquidar, fichas en
   cajeros y en jugadores) y los movimientos (liquidaciones, premios, cobros).
   **Resumen PDF** descarga todo eso para el rango elegido, más un desglose por
   cajero (liquidaciones, caja y ganancia); pagina los movimientos si no entran.
4. **Vender fichas** (solo owner) y **Mis compras de fichas** (solo
   admin): ver sección 9.
5. **Apuestas:** el reporte de rondas (juegos nativos y de proveedores) con
   apostado, premios y balance de la casa. Es el mismo componente que
   `/admin/reports/bets`, que sigue disponible para los admins.

**Comisión al dar de alta.** El formulario de alta de cajero tiene un campo
opcional "Comisión (%)": se manda como `commissionPercentage` en `POST /api/users`
y crea la modalidad vigente en `cashier_compensation_modes`. Para un admin o un
jugador se rechaza con `400`: **el admin no cobra comisión**, gana comprándole
las fichas al owner a precio diferencial (sección 9) y vendiéndoselas a sus
cajeros.

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

Todas requieren sesión y rol `OWNER` o `ADMIN` (cada uno sobre sus cajeros
directos); las mutaciones, `x-csrf-token`.

```http
GET  /api/cashier-accounts?page=&limit=&search=          # cuentas de cajeros + resumen
GET  /api/cashier-accounts/:cashierId                     # cuenta corriente del cajero
PUT  /api/cashier-accounts/:cashierId/compensation        # { type: "PERCENTAGE", percentage, prizesAffectSubtotal? }
GET  /api/cashier-accounts/:cashierId/preview?periodEnd=
POST /api/cashier-accounts/:cashierId/settlements         # liquidar
GET  /api/cashier-accounts/period?periodEnd=              # cuenta corriente de todos los cajeros al corte
GET  /api/cashier-accounts/period/summary.pdf?periodEnd=  # "Exportar diario" (parte diario)
PUT  /api/cashier-accounts/compensation/prizes-affect-subtotal  # { enabled } en todos los cajeros a cargo
GET  /api/cashier-accounts/owner?periodStart=&periodEnd=  # cuenta del owner
GET  /api/cashier-accounts/owner/summary.pdf?periodStart=&periodEnd=
GET  /api/cashier-accounts/settlements?status=&cashierId=&search=
GET  /api/cashier-accounts/settlements/latest.zip     # última liquidación de cada cajero
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

- Solo el owner y los admins, y solo sobre sus cajeros directos.
- `prizesAffectSubtotal` vive en `cashier_compensation_modes` (versionado junto
  con el %); si no se manda al cambiar la comisión, se mantiene el vigente. Cada
  liquidación guarda el valor aplicado en `cashier_settlements.prizes_deducted`.
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
- Compra de fichas de admins: `api/src/features/admin-chip-purchases/`,
  `helper/src/utils/admin-chip-pricing.utils.ts`, `DEFAULT_ADMIN_CHIP_PRICE_TIERS`
  en `helper/src/constants/index.ts`, `web-admin/components/admin/admin-chip-purchases.tsx`,
  `web-admin/components/admin/own-chip-purchases.tsx`
- Tests: `api/tests/domain/cashier-accounts.domain.test.ts`,
  `api/tests/domain/admin-chip-purchases.domain.test.ts`,
  `api/tests/utils/settlement-receipt.test.ts`

---

## 9. Compra de fichas de los admins (owner → admin)

El owner no liquida a los admins: les **vende fichas** a precio diferencial.

1. **Carga.** En **Finanzas → Vender fichas**, el owner elige un admin
   y la cantidad de fichas. Se le acreditan al instante (`SELL_TO_PLAYER` con el
   admin como `user_id`, `idempotency_key` `admin-purchase:<id>:load`) y se
   genera un **comprobante** PDF numerado (se descarga al cargar y luego desde
   la lista).
2. **Precio.** Cada carga se cotiza por su tamaño: el admin paga el porcentaje
   del tramo más alto que alcanza. Tramos por defecto:

   | Desde (fichas por carga) | Paga |
   |---|---|
   | 100.000 | 20% |
   | 500.000 | 19% |
   | 1.000.000 | 18% |
   | 10.000.000 | 17% |
   | 20.000.000 | 16% |
   | 30.000.000 | 15% |

   Ej.: 1.000.000 fichas → 18% → $180.000. Los tramos se editan por admin
   (botón de precios; "Usar los por defecto" vuelve a los de arriba). Una carga
   **menor al primer tramo** lleva el porcentaje **a mano** (queda marcada como
   manual).
3. **Pago.** La compra queda **Pago pendiente** hasta que el owner confirma que
   recibió el pago (**Confirmar pago**, con referencia opcional) → **Pagado**.
   Una compra pendiente se puede **anular**: se le retiran las fichas al admin
   (`ADJUSTMENT`, `admin-purchase:<id>:reversal`), siempre que todavía las tenga.

El admin ve sus compras, lo que debe y los comprobantes en **Finanzas → Mis
compras de fichas**.

Tablas: `admin_chip_purchases` (una fila por carga: `receipt_number` serial,
`chips`, `percentage`, `amount`, `manual_percentage`, `status`
`PENDING|PAID|CANCELED`, `chip_movement_id`, confirmación y anulación) y
`admin_chip_pricing` (`admin_id`, `tiers` JSONB; sin fila rigen los tramos por
defecto).

```http
# Owner
GET    /api/admin-chip-purchases/admins                 # admins con balance, tramos y deuda pendiente
PUT    /api/admin-chip-purchases/admins/:id/pricing     # { tiers: [{ minChips, percentage }] }
DELETE /api/admin-chip-purchases/admins/:id/pricing     # volver a los tramos por defecto
GET    /api/admin-chip-purchases?adminId=&status=&page=&limit=
POST   /api/admin-chip-purchases                        # { adminId, chips, percentage?, notes?, idempotencyKey? }
GET    /api/admin-chip-purchases/:id/receipt
POST   /api/admin-chip-purchases/:id/confirm            # { paymentReference? }
POST   /api/admin-chip-purchases/:id/cancel             # { reason? }
# Admin
GET    /api/admin-chip-purchases/me?status=&page=&limit=
GET    /api/admin-chip-purchases/me/:id/receipt
```

`percentage` es obligatorio solo si la carga es menor al primer tramo; desde el
primer tramo se ignora. Auditoría: `admin-chip-purchases.create`,
`.confirm`, `.cancel`, `.pricing.update`, `.pricing.reset`.

Es la **única** forma de cargarle fichas a un admin: `POST /api/chips/sell` del
owner a un admin y el saldo inicial al crear un admin (`initialBalance` en
`POST /api/users`) se rechazan con `400 INVALID_INPUT`. El alta de administrador
(y promover un cajero a admin) es solo del owner: un admin no puede crear
admins (`403`). Ya no tiene campo de saldo inicial y "Ajuste de saldos" no permite agregar a un
admin (restar sí).
