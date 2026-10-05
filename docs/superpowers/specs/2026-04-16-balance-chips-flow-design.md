# Balance & Chips Flow — Design Spec
**Date:** 2026-04-16  
**Branch:** balance-chips-flow

## Objetivo

Ajustar el sistema de balances para que:
- El **Owner** no tenga balance visible (es el banco, asigna fichas sin descuento propio)
- **Admin y Cajero** vean su propio balance en el dashboard y pierdan/ganen fichas según operaciones
- **Player** ya funciona correctamente, mantener comportamiento

---

## Jerarquía de roles y flujo de fichas

```
Owner (banco ilimitado)
  └─ Admin (tiene balance)
       └─ Cajero (tiene balance)
            └─ Player (tiene balance)
```

Owner asigna fichas a Admin/Cajero desde la nada (sin deducción propia).  
Admin/Cajero operan con su propio saldo al interactuar con Players.

---

## Operaciones y flujo bidireccional

| Operación | Quién la llama | Player | Cajero/Admin |
|---|---|---|---|
| `sellChips` | Cajero/Admin → Player | +amount | -amount (si no es Owner) |
| `payPrize` | Cajero/Admin ← Player canjea | -amount | +amount |
| `registerLoss` | Cajero/Admin registra pérdida | -amount | +amount |
| `withdraw` | Cajero/Admin o Player retira | -amount | +amount |

**Owner es exonerado:** nunca se modifica el balance del Owner en ninguna operación.

---

## Cambios requeridos

### Backend — `api/src/domain/chips/chips.domain.ts`

1. **`sellChips`**: agregar lock + decremento del balance del seller si `seller.role !== OWNER`
2. **`payPrize`**: corregir dirección — actualmente suma al player, debe restar del player y sumar al cajero
3. **`registerLoss`**: agregar acreditación al cajero (actualmente solo descuenta al player)
4. **`withdraw`**: agregar acreditación al cajero (actualmente solo descuenta al player)

Todas las modificaciones van dentro de la misma transacción Sequelize existente.  
Validar saldo suficiente del vendedor antes de operar.

### Frontend — `web/app/admin/dashboard/page.tsx`

- **OWNER**: reemplazar card "Balance Total" por mensaje "Sin balance propio"
- **ADMIN / CAJERO**: mostrar card "Mi Balance" conectada a `GET /chips/my-balance`

### Frontend — `web/app/admin/balances/page.tsx`

- `handleBalanceAdjustment("add")` → `POST /chips/sell` con `{ playerId, amount, description }`
- `handleBalanceAdjustment("subtract")` → `POST /chips/withdraw` con `{ playerId, amount, description }`
- Agregar feedback de éxito/error con toast
- Recargar balance del usuario afectado tras la operación

---

## Validaciones clave

- El cajero/admin debe tener saldo suficiente para `sellChips`
- El player debe tener saldo suficiente para `payPrize`, `registerLoss`, `withdraw`
- Owner nunca es afectado en su balance (exención por rol)
- La jerarquía (parentUserId) sigue siendo la validación de autorización

---

## Archivos afectados

- `api/src/domain/chips/chips.domain.ts`
- `web/app/admin/dashboard/page.tsx`
- `web/app/admin/balances/page.tsx`
