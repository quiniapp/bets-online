# Cuentas corrientes y liquidaciones de cajeros (2026-10-13)

## Objetivo

Dar al propietario un módulo de backoffice para ver la cuenta corriente de cada
cajero, configurar su comisión, generar liquidaciones por período y registrar
el pago de esas comisiones.

## Modelo

- **Comisión**: porcentaje sobre la ganancia del período. La ganancia se calcula
  como ventas de fichas menos premios pagados por el cajero. Si la ganancia es
  negativa, la comisión liquidada es 0.
- **Cuenta corriente**: totales históricos del cajero (ventas, premios, ganancia),
  comisiones pendientes de pago, comisiones pagadas y comisión estimada de los
  movimientos todavía no liquidados.
- **Liquidación**: snapshot inmutable de un período (period_start, period_end)
  con ventas, premios, ganancia, porcentaje aplicado y comisión a pagar.
  Estados: PENDING, PAID, CANCELED.
- **Pago**: marca la liquidación como PAID, guarda paid_at, paid_by y una
  referencia de pago opcional. No genera movimientos de fichas: la comisión se
  paga fuera del sistema de fichas.
- **No superposición**: no se pueden crear dos liquidaciones no canceladas del
  mismo cajero con períodos que se solapen. Una liquidación cancelada libera el
  período para volver a liquidarlo.

## Cálculo

Solo se consideran movimientos de fichas con related_user_id = cajero:

- Ventas: suma de SELL_TO_PLAYER (importe positivo).
- Premios: suma de PRIZE con signo invertido (en el movimiento el importe es
  negativo).
- ganancia = ventas - premios.
- comisión = max(0, ganancia) * porcentaje / 100, redondeada a 2 decimales.

La modalidad de comisión aplicada es la vigente al cierre del período, y se
guarda como snapshot en la liquidación. Cambiar el porcentaje cierra la
modalidad anterior y crea una nueva con active_from = now.

## API

Todas las rutas requieren rol OWNER.

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/cashier-accounts | Lista paginada de cajeros con su cuenta y un resumen global. |
| GET | /api/cashier-accounts/:id | Detalle: resumen, liquidaciones y movimientos recientes. |
| PUT | /api/cashier-accounts/:id/compensation | Configura el porcentaje vigente. |
| GET | /api/cashier-accounts/:id/preview?periodStart&periodEnd | Calcula una liquidación sin persistirla. |
| POST | /api/cashier-accounts/:id/settlements | Crea una liquidación pendiente. |
| GET | /api/cashier-accounts/settlements | Historial global con filtros. |
| POST | /api/cashier-accounts/settlements/:id/pay | Registra el pago total. |
| POST | /api/cashier-accounts/settlements/:id/cancel | Anula una liquidación pendiente. |

## Backoffice

/admin/cashier-accounts (solo propietario):

- Tarjetas con cuentas, ganancia acumulada, comisiones por pagar y pagadas.
- Tabla de cajeros con comisión vigente, ventas/premios, ganancia, saldo a favor
  y acciones (configurar comisión, liquidar, ver detalle).
- Pestaña de liquidaciones con filtro por estado y acciones de pago/cancelación.
- Diálogos de configuración, preview de liquidación, pago y detalle de cuenta.

## Fuera de alcance

- Paneles de fichas (chip_panels), recuperos y modalidades FIXED/HYBRID.
- Pagos parciales o en cuotas (el enum PARTIALLY_PAID queda disponible).
- Movimientos contables en fichas para el pago de comisiones.
