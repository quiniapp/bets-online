# Cuentas corrientes y liquidaciones de cajeros

Guía funcional y técnica del módulo con el que el **propietario** gestiona la
cuenta corriente de sus cajeros, liquida comisiones y registra sus pagos.

- **Backoffice:** `/admin/cashier-accounts`
- **API:** `/api/cashier-accounts`
- **Rol habilitado:** `OWNER`
- **Migración:** `20261013000001-extend-cashier-settlements.js`
- **Feature:** `feature/cashier-accounts`

---

## 1. Qué resuelve

El módulo responde tres preguntas del dueño:

1. **¿Cuánto le debe a cada cajero por comisiones?**
2. **¿Qué período conviene liquidar y cuánto corresponde pagar?**
3. **¿Qué comisiones ya se pagaron y cuáles siguen pendientes?**

La cuenta corriente se calcula a partir de los movimientos de fichas que el
cajero realizó (ventas y premios) y de las liquidaciones creadas. El pago de la
comisión se registra como un hecho administrativo: **no mueve fichas ni saldos**.

---

## 2. Glosario

| Término | Significado |
|---|---|
| **Cajero** | Usuario con rol `CASHIER` dentro del árbol del propietario. |
| **Venta** | Movimiento `SELL_TO_PLAYER` donde el cajero es `related_user_id`. |
| **Premio** | Movimiento `PRIZE` pagado por el cajero. En el movimiento el importe es negativo. |
| **Ganancia** | Ventas menos premios del período o del histórico. |
| **Comisión** | Porcentaje de la ganancia que le corresponde al cajero. |
| **Liquidación** | Snapshot de un período con ventas, premios, ganancia, porcentaje y comisión a pagar. |
| **Comisión abierta** | Comisión estimada de movimientos que todavía no fueron liquidados. |
| **Pago** | Marca una liquidación como pagada. No genera movimientos de fichas. |

---

## 3. Flujo operativo en el backoffice

### 3.1 Configurar la comisión

1. Entrar a **Cuentas corrientes** desde el menú del propietario.
2. En la fila del cajero, presionar el botón de **porcentaje**.
3. Ingresar un valor entre `0` y `100`.
4. Guardar.

El cambio crea una nueva modalidad de comisión desde ese momento y cierra la
anterior. Las liquidaciones ya creadas conservan el porcentaje con el que se
calcularon (snapshot).

### 3.2 Revisar la cuenta

La tabla principal muestra, por cajero:

- Comisión vigente.
- Ventas y premios acumulados.
- Ganancia acumulada.
- Saldo a favor del cajero:
  - liquidaciones pendientes de pago;
  - comisión abierta de movimientos todavía no liquidados.

El botón de **detalle** abre el resumen, los movimientos recientes y el
historial de liquidaciones del cajero.

### 3.3 Crear una liquidación

1. Presionar el botón de **calculadora** en la fila del cajero.
2. Elegir **Desde** y **Hasta**.
3. El sistema calcula automáticamente ventas, premios, ganancia y comisión.
4. Revisar el preview y presionar **Crear liquidación**.

La liquidación queda en estado `PENDING`. No se puede crear otra liquidación
del mismo cajero con un período que se superponga, salvo que la anterior esté
cancelada.

### 3.4 Pagar la comisión

1. Ir a la pestaña **Liquidaciones**.
2. Buscar la liquidación pendiente.
3. Presionar **Pagar**.
4. Opcionalmente, ingresar una referencia de pago (transferencia, comprobante,
   etc.).
5. Confirmar.

La liquidación pasa a `PAID`, se guarda la fecha de pago, el usuario que pagó y
la referencia. **No se descuentan fichas ni se modifica el balance del cajero.**

### 3.5 Cancelar una liquidación

Solo se puede cancelar una liquidación `PENDING`. Al cancelarla:

- pasa a `CANCELED`;
- deja de sumar en los totales de comisiones pendientes/pagadas;
- libera el período para volver a liquidarlo.

No se puede cancelar una liquidación ya pagada.

---

## 4. Fórmulas

### 4.1 Movimientos considerados

Solo se consideran movimientos de fichas cuyo `related_user_id` es el cajero:

```text
ventas   = Σ amount de movimientos SELL_TO_PLAYER
premios  = Σ (-amount) de movimientos PRIZE
ganancia = ventas - premios
comisión = max(0, ganancia) × porcentaje / 100
```

Los importes se redondean a **2 decimales**.

Notas:

- En los movimientos `PRIZE` el importe se guarda en negativo; por eso se
  invierte el signo para obtener el premio pagado.
- Si la ganancia es negativa o cero, la comisión es **0**. Las pérdidas no se
  arrastran automáticamente a períodos futuros.
- No se incluyen en la cuenta del cajero los movimientos de juegos de proveedor
  (`GAME_BET`, `GAME_WIN`, `GAME_REFUND`) porque no están atribuidos a un
  cajero.
- Tampoco se incluyen premios automáticos de juegos nativos que no tengan
  `related_user_id`.

### 4.2 Ejemplo con ganancia

| Concepto | Importe |
|---|---:|
| Ventas del período | 150.000,00 |
| Premios pagados | 90.000,00 |
| Ganancia | 60.000,00 |
| Porcentaje | 25% |
| **Comisión a pagar** | **15.000,00** |

### 4.3 Ejemplo con pérdida

| Concepto | Importe |
|---|---:|
| Ventas del período | 50.000,00 |
| Premios pagados | 70.000,00 |
| Ganancia | -20.000,00 |
| Porcentaje | 25% |
| **Comisión a pagar** | **0,00** |

### 4.4 Período sin movimientos

Si no hay ventas ni premios, la ganancia y la comisión son `0`. En el backoffice
el botón **Crear liquidación** se deshabilita para evitar liquidaciones vacías.

---

## 5. Cómo se arma la cuenta corriente

El resumen de cada cajero incluye:

| Campo | Cálculo |
|---|---|
| `totalSales` | Suma histórica de ventas del cajero. |
| `totalPrizes` | Suma histórica de premios pagados por el cajero. |
| `profit` | `totalSales - totalPrizes`. |
| `pendingAmount` | Suma de `payableAmount` de liquidaciones `PENDING`. |
| `paidAmount` | Suma de `payableAmount` de liquidaciones `PAID`. |
| `openProfit` | Ganancia histórica menos la ganancia ya incluida en liquidaciones no canceladas. |
| `openCommission` | Estimación de comisión sobre `openProfit` usando la modalidad vigente. |
| `balanceDue` | `pendingAmount + openCommission`. |
| `chipBalance` | Balance de fichas actual del cajero (informativo). |
| `lastSettlementAt` | Fecha de la última liquidación no cancelada. |
| `lastPaidAt` | Fecha del último pago. |

Las liquidaciones canceladas **no** se restan de los totales históricos. Las
liquidaciones `PENDING` y `PAID` sí forman parte de lo ya liquidado.

### 5.1 Comisión abierta

La comisión abierta es una **estimación**, no una deuda formal. Se calcula así:

```text
ventasLiquidadas  = Σ totalSales de liquidaciones no canceladas
premiosLiquidados = Σ totalPrizesPaid de liquidaciones no canceladas

ventasAbiertas  = max(0, totalSales - ventasLiquidadas)
premiosAbiertos = max(0, totalPrizes - premiosLiquidados)
gananciaAbierta = ventasAbiertas - premiosAbiertos
comisionAbierta = max(0, gananciaAbierta) × porcentajeVigente / 100
```

Por eso el saldo a favor puede mostrar dos componentes:

- **liquidado**: ya existe una liquidación pendiente;
- **abierto**: todavía no se creó la liquidación.

---

## 6. Modelo de datos

### 6.1 `chip_movements`

Es la fuente de verdad de ventas y premios. El módulo no duplica esos importes
en otra tabla: los agrega por `related_user_id` y tipo de movimiento.

### 6.2 `cashier_compensation_modes`

Historial de modalidades de comisión del cajero:

| Campo | Descripción |
|---|---|
| `cashier_id` | Cajero. |
| `type` | `PERCENTAGE` (única modalidad implementada). |
| `percentage` | Porcentaje entre 0 y 100. |
| `active_from` | Inicio de vigencia. |
| `active_to` | Fin de vigencia; `NULL` si sigue vigente. |

Al cambiar el porcentaje se crea una modalidad nueva y se cierra la anterior.
La liquidación aplica la modalidad vigente al cierre del período y guarda una
copia del porcentaje.

### 6.3 `cashier_settlements`

| Campo | Descripción |
|---|---|
| `cashier_id` | Cajero liquidado. |
| `period_start`, `period_end` | Período liquidado. |
| `total_sales` | Ventas del período. |
| `total_prizes_paid` | Premios del período. |
| `profit` | Ganancia del período. |
| `payable_amount` | Comisión a pagar. |
| `status` | `PENDING`, `PAID` o `CANCELED`. |
| `compensation_type` | Tipo aplicado (`PERCENTAGE`). |
| `percentage` | Porcentaje aplicado (snapshot). |
| `notes` | Notas de creación, pago o cancelación. |
| `created_by` | Usuario que creó la liquidación. |
| `paid_by` | Usuario que registró el pago. |
| `payment_reference` | Referencia externa del pago. |
| `created_at` | Fecha de creación. |
| `paid_at` | Fecha de pago. |

### 6.4 Estados

```text
PENDING ──► PAID
   │
   └──────► CANCELED
```

- `PAID` y `CANCELED` son estados finales.
- Una liquidación cancelada libera su período.
- Una liquidación pagada no se puede cancelar.

---

## 7. API

Todas las rutas requieren sesión autenticada y rol `OWNER`. Las mutaciones
requieren el header `x-csrf-token`, igual que el resto de la API.

### 7.1 Listar cuentas

```http
GET /api/cashier-accounts?page=1&limit=20&search=jota
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "cashierId": "uuid",
        "username": "cajero1",
        "compensation": {
          "type": "PERCENTAGE",
          "percentage": 25,
          "activeFrom": "2026-10-01T12:00:00.000Z"
        },
        "totalSales": 150000,
        "totalPrizes": 90000,
        "profit": 60000,
        "pendingAmount": 15000,
        "paidAmount": 0,
        "openProfit": 0,
        "openCommission": 0,
        "balanceDue": 15000
      }
    ],
    "summary": {
      "totalCashiers": 1,
      "totalSales": 150000,
      "totalPrizes": 90000,
      "totalProfit": 60000,
      "pendingAmount": 15000,
      "paidAmount": 0,
      "openCommission": 0,
      "balanceDue": 15000
    }
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 7.2 Detalle de una cuenta

```http
GET /api/cashier-accounts/:cashierId
```

Devuelve:

- `account`: el resumen de la cuenta.
- `settlements`: todas las liquidaciones del cajero.
- `movements`: últimos 50 movimientos de venta/premio, con el jugador asociado.

### 7.3 Configurar comisión

```http
PUT /api/cashier-accounts/:cashierId/compensation
Content-Type: application/json
x-csrf-token: ...

{
  "type": "PERCENTAGE",
  "percentage": 30
}
```

### 7.4 Preview de liquidación

```http
GET /api/cashier-accounts/:cashierId/preview?periodStart=2026-10-01T00:00:00.000Z&periodEnd=2026-10-07T23:59:59.999Z
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "cashierId": "uuid",
    "periodStart": "2026-10-01T00:00:00.000Z",
    "periodEnd": "2026-10-07T23:59:59.999Z",
    "compensation": {
      "type": "PERCENTAGE",
      "percentage": 25,
      "activeFrom": "2026-10-01T12:00:00.000Z"
    },
    "totalSales": 150000,
    "totalPrizes": 90000,
    "profit": 60000,
    "payableAmount": 15000
  }
}
```

No persiste nada.

### 7.5 Crear liquidación

```http
POST /api/cashier-accounts/:cashierId/settlements
Content-Type: application/json
x-csrf-token: ...

{
  "periodStart": "2026-10-01T00:00:00.000Z",
  "periodEnd": "2026-10-07T23:59:59.999Z",
  "notes": "Semana 40"
}
```

Errores esperables:

- `400`: período inválido o cajero sin comisión configurada para el período.
- `409`: ya existe una liquidación no cancelada que se superpone.

### 7.6 Listar liquidaciones

```http
GET /api/cashier-accounts/settlements?page=1&limit=20&status=PENDING&cashierId=uuid&search=cajero
```

Filtros opcionales: `status`, `cashierId`, `search` por username del cajero.

### 7.7 Pagar liquidación

```http
POST /api/cashier-accounts/settlements/:settlementId/pay
Content-Type: application/json
x-csrf-token: ...

{
  "paymentReference": "TRANSFER-1234",
  "notes": "Pagado por transferencia"
}
```

La liquidación debe estar pendiente. Si ya está pagada o cancelada, devuelve
`409`.

### 7.8 Descargar comprobante PDF

```http
GET /api/cashier-accounts/settlements/:settlementId/receipt
```

Devuelve un PDF con fecha, hora, usuario, monto, período, estado y datos de la
comisión. El backoffice lo descarga automáticamente al crear una liquidación y
también permite descargarlo desde la tabla de liquidaciones.

### 7.9 Cancelar liquidación

```http
POST /api/cashier-accounts/settlements/:settlementId/cancel
Content-Type: application/json
x-csrf-token: ...

{
  "reason": "Período cargado por error"
}
```

Solo se puede cancelar una liquidación pendiente.

---

## 8. Interfaz del backoffice

Ruta: **`/admin/cashier-accounts`**. El ítem del menú solo aparece para el rol
`OWNER`.

### 8.1 Tarjetas de resumen

- **Cuentas de cajeros:** cantidad de cajeros en el árbol.
- **Ganancia acumulada:** ventas menos premios de todos los cajeros.
- **Comisiones por pagar:** liquidaciones pendientes + comisión abierta.
- **Comisiones pagadas:** histórico de liquidaciones pagadas.

### 8.2 Pestaña “Cuentas de cajeros”

Columnas:

- Cajero, estado, balance de fichas.
- Comisión vigente y fecha desde.
- Ventas / premios.
- Ganancia.
- Saldo a favor (liquidado + abierto).
- Acciones: configurar comisión, crear liquidación, ver detalle.

### 8.3 Pestaña “Liquidaciones”

Muestra todas las liquidaciones con:

- cajero;
- período;
- ventas, premios, ganancia;
- comisión y porcentaje aplicado;
- estado;
- fecha/referencia de pago;
- acciones **Pagar**, **Cancelar** y **Descargar comprobante PDF**.

Filtro por estado: todas, pendientes, pagadas o canceladas.

Al crear una liquidación, el comprobante PDF se descarga automáticamente.

### 8.4 Movimientos de un cajero

En el detalle de usuario y en el historial de movimientos se incluyen las ventas
y premios **operados** por el cajero, además de sus propias cargas y retiros.
En esas filas el usuario que se muestra es el jugador afectado y el balance
corresponde al jugador; por eso las columnas de balance se muestran como `—`
para los movimientos relacionados.

### 8.5 Diálogo de detalle

Incluye:

- resumen de la cuenta;
- movimientos recientes de ventas y premios;
- historial de liquidaciones.

---

## 9. Reglas y validaciones

- Solo el **propietario** puede acceder. La API lo valida con `requireRole` y
  además en el dominio.
- El cajero debe existir, tener rol `CASHIER` y estar dentro del árbol del
  propietario.
- El porcentaje debe estar entre 0 y 100.
- `periodEnd` debe ser posterior a `periodStart`.
- No se permiten liquidaciones superpuestas no canceladas para el mismo cajero.
- No se puede crear una liquidación sin modalidad de comisión vigente para el
  período.
- No se puede pagar una liquidación ya pagada o cancelada.
- No se puede cancelar una liquidación pagada.
- Los importes se redondean a 2 decimales.
- Cada operación relevante escribe auditoría:
  - `cashier-accounts.compensation.update`
  - `cashier-accounts.settlement.create`
  - `cashier-accounts.settlement.pay`
  - `cashier-accounts.settlement.cancel`

---

## 10. Operación y despliegue

### 10.1 Aplicar la migración

```bash
APP_ENV=development pnpm --filter api db:migrate
```

Para producción:

```bash
APP_ENV=production pnpm --filter api db:migrate
```

La migración agrega a `cashier_settlements`:

- `compensation_type`
- `percentage`
- `notes`
- `created_by`
- `paid_by`
- `payment_reference`
- índice `idx_cashier_settlements_cashier_period`
- constraint `check_settlement_percentage`

### 10.2 Tests

```bash
pnpm --filter helper build
pnpm --filter api test -- tests/domain/cashier-accounts.domain.test.ts
```

Los tests cubren:

- cálculo de cuenta corriente;
- snapshot de comisión al crear una liquidación;
- rechazo de períodos superpuestos;
- rechazo sin comisión configurada;
- pago de liquidaciones;
- doble pago;
- actualización de modalidad;
- acceso solo para `OWNER`.

---

## 11. Limitaciones actuales

- Solo está implementada la modalidad **`PERCENTAGE`**. `FIXED`, `HYBRID` y
  paneles de fichas quedan fuera de alcance.
- No hay pagos parciales ni en cuotas. El estado `PARTIALLY_PAID` existe en el
  enum pero el flujo actual paga el total.
- Las pérdidas de un período no se acumulan automáticamente para el siguiente.
- El pago de la comisión no genera un movimiento de fichas ni afecta el balance.
- No hay liquidación automática por cron: la crea el propietario.
- Los juegos de proveedor no se atribuyen a un cajero, por lo que no entran en
  la fórmula de comisión.
- No hay campo de moneda: los importes usan la unidad de fichas/valor que ya
  maneja la plataforma.

---

## 12. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `403` | El usuario no es `OWNER` o el cajero no está en su árbol. | Usar la cuenta del propietario. |
| `404 Cashier not found` | El usuario no existe o no es `CASHIER`. | Verificar el rol y el árbol. |
| `400` al crear liquidación | Período inválido o cajero sin comisión configurada. | Configurar el porcentaje y revisar las fechas. |
| `409` al crear liquidación | Ya existe una liquidación no cancelada superpuesta. | Cancelar la existente o elegir otro período. |
| `409` al pagar | La liquidación ya fue pagada o cancelada. | Refrescar la lista. |
| `409` al cancelar | La liquidación ya fue pagada o cancelada. | Refrescar la lista. |
| No aparece el botón Crear liquidación | No hay movimientos o no hay comisión configurada. | Revisar el preview y configurar la comisión. |
| El saldo no coincide con lo esperado | Hay movimientos posteriores al último cierre o comisiones estimadas. | Crear una liquidación del período faltante y revisar el detalle. |
| `401` / `CSRF_INVALID` | Sesión vencida o falta el token CSRF. | Volver a iniciar sesión; usar `apiService` para las mutaciones. |

---

## 13. Referencias de código

- Dominio: `api/src/features/cashier-accounts/cashier-accounts.domain.ts`
- Repositorio: `api/src/features/cashier-accounts/cashier-accounts.repository.ts`
- Rutas: `api/src/features/cashier-accounts/cashier-accounts.routes.ts`
- Controlador: `api/src/features/cashier-accounts/cashier-accounts.controller.ts`
- Modelo de liquidación: `api/src/features/chips/cashier-settlement.model.ts`
- Migración: `api/src/persistence/migrations/20261013000001-extend-cashier-settlements.js`
- Página del backoffice: `web-admin/app/admin/cashier-accounts/page.tsx`
- Hook: `web-admin/hooks/useCashierAccounts.ts`
- Tests: `api/tests/domain/cashier-accounts.domain.test.ts`
- Diseño original: `docs/superpowers/specs/2026-10-13-cashier-accounts-design.md`
