# PRD – Plataforma Web de Gestión de Casino

## 1. Resumen Ejecutivo

La plataforma será una **web de gestión para un casino basado en fichas**, con foco en:

- Gestión jerárquica de usuarios (Dueño → Administradores → Cajeros → Jugadores).
- Administración de fichas (compra/venta, premios, retiros, recuperos).
- Múltiples modelos de cobro para cajeros (por porcentaje / por panel / extensible a otros).
- Visibilidad contable y trazabilidad completa de movimientos de fichas.

El sistema se desarrollará con **stack PERN** (PostgreSQL, Express, React, Node) usando **TypeScript**, autenticación **JWT** y manejo de sesiones para los usuarios.

---

## 2. Objetivos del Producto

### 2.1 Objetivos de Negocio

- Centralizar la gestión de fichas y el flujo económico del casino.
- Controlar la jerarquía de usuarios y sus relaciones (quién registra a quién).
- Facilitar la liquidación de comisiones/ganancias de cajeros y administradores.
- Aumentar la transparencia contable y reducir errores manuales.

### 2.2 Objetivos del MVP

- Definir y operar la jerarquía de usuarios (Dueño, Administrador, Cajero, Jugador).
- Registrar y gestionar fichas (ventas, premios, recargas, retiros, recuperos).
- Soportar al menos dos formas de cobro a cajeros:
  - **Ganancia semanal por porcentaje** (ventas – premios).
  - **Cobro por panel** (diferencia entre precio de compra y venta de fichas).
- Proveer vistas de contabilidad básica para cada rol según sus permisos.
- Dejar la arquitectura preparada para futuras modalidades de cobro y de recupero.

---

## 3. Alcance del MVP

### 3.1 Incluido

- Registro y gestión de usuarios:
  - Dueño (1 por plataforma).
  - Administradores.
  - Cajeros.
  - Jugadores.
- Árbol jerárquico de usuarios:
  - Cada usuario tiene un **padre** (quien lo registró), excepto el Dueño.
  - Cada usuario puede ver solo su subárbol “hacia abajo”.
- Funcionalidad de gestión de usuarios:
  - Alta, edición, bloqueo/desbloqueo de usuarios según rol.
  - Cambio de contraseña propia.
  - Blanqueo/reset de contraseñas según permisos.
- Gestión de fichas:
  - Dueño y administradores como origen de fichas.
  - Administradores venden fichas a cajeros, definiendo precio y modalidad de cobro.
  - Cajeros venden fichas a jugadores y pagan premios.
  - Registro de premios, retiros y recargas.
  - Registro histórico (log) de todos los movimientos de fichas.
- Modelos de cobro al cajero:
  - **Por porcentaje semanal**:
    - Ganancia = Venta de fichas a los usuarios – Pago de premios.
    - Si la ganancia es negativa, el cajero no cobra hasta volver a positivo.
  - **Por panel**:
    - Diferencia entre precio de compra y venta de fichas.
    - El panel se liquida cuando todas las fichas asignadas se venden.
- Gestión de **recupero** entre administrador y cajero:
  - Registro de deudas cuando un administrador asiste a un cajero a pagar premios.
  - Diseño **extensible** para soportar múltiples modalidades de recupero en el futuro.
- Bloqueo de usuarios y de proveedores de juego:
  - Dueño y administradores pueden bloquear usuarios dentro de su subárbol.
  - Cajeros pueden bloquear jugadores y proveedores de juego asociados a sus jugadores.
- Vistas de contabilidad por usuario:
  - Saldos de fichas.
  - Historial de movimientos.
  - Liquidaciones de cajeros.

### 3.2 Fuera de Alcance (versión futura)

- Integraciones con proveedores de juego reales (slots, ruleta, etc.).
- Pasarelas de pago online / integración bancaria.
- Soporte multi-moneda.
- Reportes analíticos avanzados (BI, dashboards complejos).
- Más modalidades de cobro a cajeros (fijo, híbridos, etc.).
- Funcionalidad mobile nativa (la web puede ser responsive para smartphones).

---

## 4. Roles y Permisos

### 4.1 Dueño

**Responsabilidades principales:**

- Gestionar la plataforma a nivel global.
- Administrar el máximo nivel de la jerarquía de usuarios.

**Permisos:**

- Crear administradores.
- Ver **todo el árbol** de usuarios y sus saldos.
- Ver contabilidad agregada general y por usuario.
- **Cambiar su propia contraseña.**
- **Blanquear / resetear la contraseña** de cualquier usuario (todo el árbol).
- **Bloquear / desbloquear usuarios** de cualquier rol (administradores, cajeros, jugadores).

### 4.2 Administrador

**Alta:**

- Lo da de alta el Dueño o un Administrador superior.

**Permisos:**

- Crear y gestionar:
  - Cajeros.
  - Jugadores.
  - Otros administradores dentro de su subárbol (opcional según definición de negocio).
- Definir el precio de fichas para cada cajero.
- Definir la modalidad de cobro de cada cajero:
  - Porcentaje semanal.
  - Panel.
- Ver contabilidad de:
  - Cajeros que registró.
  - Jugadores dentro de su subárbol.
  - Administradores descendientes (si aplica).
- Gestionar **recuperos** con sus cajeros.
- Bloqueo:
  - **Bloquear / desbloquear usuarios** (cajeros, administradores descendientes, jugadores) **dentro de su subárbol**.
- Contraseñas:
  - **Cambiar su propia contraseña.**
  - **Blanquear / resetear la contraseña** de:
    - Cajeros dentro de su subárbol.
    - Jugadores dentro de su subárbol.
    - Administradores que estén por debajo en su jerarquía (si se permite).

**Visibilidad:**

- No puede ver “hacia arriba” (no ve contabilidad del Dueño ni de otros administradores fuera de su árbol).

### 4.3 Cajero

**Alta:**

- Lo da de alta un Administrador o un Cajero con permiso de crear cajeros (en cuyo caso puede promover a “administrador” a otros, según reglas de negocio).

**Permisos:**

- Crear jugadores (enlazándolos jerárquicamente como “hijos”).
- Ver sus jugadores (solo “hacia abajo”).
- Cambios de contraseña:
  - **Cambiar su propia contraseña.**
  - **Blanquear / resetear la contraseña** de los jugadores que registró (y subárbol, si aplica).
- Gestión de usuarios:
  - Bloquear jugadores que registró.
  - Bloquear proveedores de juego para sus jugadores.
- Gestión de fichas:
  - Vender fichas a sus jugadores.
  - Registrar cobro de premios (recibir fichas y pagar dinero).
  - Ver contabilidad de sus jugadores (movimientos y saldos).
  - Ver su propia contabilidad:
    - Ventas de fichas.
    - Premios pagados.
    - Comisiones / ganancias (porcentaje o panel).
    - Recuperos pendientes o saldados.
- Estructura:
  - Referir otros cajeros.
  - Dar de alta otros cajeros y, eventualmente, promoverlos a administradores (según reglas de negocio definidas, no obligatorias en el MVP).

**Visibilidad:**

- No puede ver “hacia arriba” (no ve información de su administrador ni del dueño).

### 4.4 Jugador

**Alta:**

- Lo da de alta un Cajero o un Administrador.

**Permisos:**

- Acceder a su cuenta (login).
- **Cambiar su propia contraseña.**
- Ver su saldo de fichas.
- Ver su historial de movimientos:
  - Cargas.
  - Premios.
  - Pérdidas.
  - Retiros.
- Solicitar carga de fichas a la persona que lo registró (su “padre” en la jerarquía).

---

## 5. Reglas de Negocio Clave

### 5.1 Jerarquía y Visibilidad

- Cada usuario (excepto el Dueño) tiene un **parent_user_id** que indica quién lo registró.
- Se forma un árbol jerárquico:
  - Dueño → Admin A → Cajero X → Jugador 1, Jugador 2, etc.
  - Admin A → Admin B → Cajero Y → Jugadores de Y, etc.
- Regla de visibilidad:
  - Cada usuario puede ver **solo los usuarios de su subárbol hacia abajo** (hijos, nietos, etc.).
  - Ningún usuario (excepto el Dueño) puede ver “hacia arriba”.

### 5.2 Carga y Flujo de Fichas

- El flujo de fichas sigue la cadena de registro:
  - Si un Administrador registra a otro Administrador, el segundo carga fichas con el primero.
  - El primer Administrador carga fichas con quien lo registró (otro Administrador o el Dueño).
- Para jugadores:
  - El jugador carga fichas **con la persona que lo registró** (cajero o administrador).
- Cada operación de fichas genera un **movimiento contable**:
  - Datos mínimos:
    - Fecha y hora.
    - Usuario afectado.
    - Usuario relacionado (si aplica, ejemplo: cajero que vendió fichas).
    - Cantidad de fichas (positiva o negativa).
    - Tipo de movimiento (VENTA, PREMIO, CARGA, RETIRO, RECUPERO, AJUSTE, etc.).
    - Saldo anterior y saldo resultante.
- Los saldos deben ser siempre derivables a partir del histórico de movimientos (auditoría).

### 5.3 Resultados de Juego (Simulación MVP)

Para el **MVP**:

- No se integran proveedores reales de juego.
- Los resultados de ganar/perder se **simulan dentro del sistema**:
  - Opción 1 (simple): el cajero o administrador registra manualmente resultados (victoria/derrota) para un jugador.
  - Opción 2 (demo): un módulo de prueba genera resultados pseudoaleatorios (a definir con el cliente).
- Cuando un jugador **gana**:
  - Se le **acreditan fichas** (movimiento positivo).
- Cuando un jugador **pierde**:
  - Se le **debita fichas** (movimiento negativo).
- Todos los movimientos asociados a resultados de juego deben ser visibles:
  - Para el jugador (su historial).
  - Para el cajero.
  - Para el administrador correspondiente.

### 5.4 Modalidades de Cobro del Cajero

#### 5.4.1 Modalidad por Porcentaje Semanal

- Fórmula básica:

> **Ganancia = Venta de fichas a los usuarios – Pago de premios**

- La ventana temporal (semana) puede definirse como:
  - Semana calendario.
  - Semana configurable (parámetro del sistema).
- Si la ganancia es **negativa**:
  - El cajero **no cobra** esa semana.
  - La pérdida puede considerarse acumulada para futuros períodos (a definir con el cliente).
- Se necesitan:
  - Cálculo automático de la ganancia por período.
  - Registro de liquidaciones históricas por cajero.

#### 5.4.2 Modalidad por Panel

- El cajero compra fichas a un precio de compra por ficha (definido por el administrador).
- El cajero las vende a un precio de venta por ficha.
- La ganancia del cajero:

> **Ganancia del panel = (Precio de venta – Precio de compra) × total de fichas vendidas del panel**

- El panel se **liquida** cuando se venden todas las fichas asignadas.
- El sistema debe:
  - Permitir la creación de “paneles” de fichas asignados a un cajero.
  - Registrar cuántas fichas se vendieron de cada panel.
  - Marcar el panel como “COMPLETO” cuando llega al 100% de ventas.
  - Calcular y registrar la ganancia del cajero por panel.

#### 5.4.3 Otras Modalidades

- Se asume que en el futuro habrá más modalidades (fijo, mixto, bonus, etc.).
- El diseño de datos y de negocio debe ser **extensible** para soportar nuevas modalidades sin romper las existentes.

### 5.5 Recupero (Extensible)

- Situación:
  - Un cajero no tiene fondos para pagar un premio.
  - Solicita ayuda a su administrador.
- Proceso:
  - El administrador aporta dinero/valor para que el cajero pueda pagar el premio.
  - El sistema registra esta operación como **“recupero”**:
    - Asociada al cajero y al administrador.
    - Asociada al movimiento de premio, si corresponde.
- Requisitos:
  - Registrar:
    - Importe del recupero.
    - Fecha de creación.
    - Estado (PENDIENTE, PARCIAL, SALDADO).
  - El recupero debe reflejarse como deuda pendiente en la contabilidad del cajero y del administrador.

**Extensibilidad:**

- El modelo de recupero debe permitir múltiples estrategias:
  - Descuento automático en futuras liquidaciones de comisión.
  - Planes de pago en cuotas.
  - Cancelaciones manuales parciales.
- Se recomienda:
  - Campo `recovery_mode` (ej. AUTO_DEDUCT_FROM_COMMISSION, INSTALMENTS, MANUAL).
  - Tabla adicional para parámetros por modo (porcentaje, cantidad de cuotas, etc.).
- El MVP puede implementar un solo modo sencillo, pero la estructura debe ser extensible.

---

## 6. Casos de Uso (User Stories)

### 6.1 Dueño

- **D1**: Como Dueño quiero **crear administradores** asignándoles usuario y contraseña, para delegar la gestión del casino.
- **D2**: Como Dueño quiero **ver el árbol completo** de usuarios y sus saldos, para tener control global de la operación.
- **D3**: Como Dueño quiero **bloquear y desbloquear usuarios** de cualquier rol, para cortar acceso cuando haya comportamientos indebidos.
- **D4**: Como Dueño quiero **blanquear contraseñas** de cualquier usuario, para dar soporte cuando otros roles no puedan recuperar el acceso.

### 6.2 Administrador

- **A1**: Como Administrador quiero **crear cajeros y jugadores**, para operar mi parte del negocio.
- **A2**: Como Administrador quiero **definir el precio de fichas** y **modalidad de cobro** de cada cajero (porcentaje/panel), para gestionar sus condiciones comerciales.
- **A3**: Como Administrador quiero **ver la contabilidad** de mis cajeros, jugadores y administradores descendientes, para controlar su performance.
- **A4**: Como Administrador quiero **registrar y gestionar recuperos** con mis cajeros, para llevar un seguimiento de las ayudas brindadas.
- **A5**: Como Administrador quiero **bloquear usuarios** (cajeros, jugadores y administradores descendientes) dentro de mi subárbol, para gestionar riesgos.
- **A6**: Como Administrador quiero **blanquear contraseñas** de cajeros y jugadores de mi subárbol, para asistir cuando pierden acceso.
- **A7**: Como Administrador quiero **cambiar mi propia contraseña**, para mantener la seguridad de mi cuenta.

### 6.3 Cajero

- **C1**: Como Cajero quiero **registrar jugadores**, para poder venderles fichas y pagar premios.
- **C2**: Como Cajero quiero **vender fichas** a mis jugadores y registrar los movimientos, para mantener saldos actualizados.
- **C3**: Como Cajero quiero **registrar pagos de premios** a mis jugadores, para reflejar correctamente los premios y retiros.
- **C4**: Como Cajero quiero **ver mi contabilidad** (ventas, premios, comisiones, recuperos), para entender mis ganancias.
- **C5**: Como Cajero quiero **ver la contabilidad de mis jugadores**, para controlar su actividad y saldos.
- **C6**: Como Cajero quiero **bloquear jugadores y proveedores de juego** asociados a mis jugadores, para evitar usos indebidos.
- **C7**: Como Cajero quiero **blanquear contraseñas** de los jugadores que registré, para ayudarlos a recuperar acceso.
- **C8**: Como Cajero quiero **cambiar mi propia contraseña**, para mantener segura mi cuenta.
- **C9**: Como Cajero quiero **referir otros cajeros** y, si la política lo permite, promoverlos a administradores, para expandir mi red.

### 6.4 Jugador

- **J1**: Como Jugador quiero **ver mi saldo de fichas**, para saber cuánto puedo jugar.
- **J2**: Como Jugador quiero **ver mi historial de movimientos** (cargas, premios, pérdidas, retiros), para controlar mi actividad.
- **J3**: Como Jugador quiero **solicitar carga de fichas** a la persona que me registró, para continuar jugando.
- **J4**: Como Jugador quiero **cambiar mi propia contraseña**, para mantener segura mi cuenta.

---

## 7. Modelo de Datos (Borrador)

> Esto es un primer acercamiento para PostgreSQL; podrá ajustarse en la etapa de diseño técnico.

### 7.1 Entidades Principales

**Tabla `users`**

- id (PK)
- parent_user_id (FK → users.id, nullable para Dueño)
- role (OWNER, ADMIN, CASHIER, PLAYER)
- username / email (únicos)
- password_hash
- status (ACTIVE, BLOCKED)
- created_at
- updated_at

**Tabla `balances`**

- id (PK)
- user_id (FK → users.id)
- chip_balance (NUMERIC)
- last_updated_at

**Tabla `chip_movements`**

- id (PK)
- user_id (usuario afectado)
- related_user_id (usuario relacionado, opcional)
- type (SELL_TO_PLAYER, BUY_FROM_ADMIN, PRIZE, LOSS, WITHDRAWAL, RECOVERY, ADJUSTMENT, etc.)
- amount (NUMERIC, positivo o negativo)
- description (TEXT)
- previous_balance (NUMERIC)
- new_balance (NUMERIC)
- created_at

**Tabla `cashier_compensation_modes`**

- id (PK)
- cashier_id (FK → users.id)
- type (PERCENTAGE, PANEL, FUTURE_MODE_X, etc.)
- percentage (NUMERIC, nullable si no aplica)
- active_from
- active_to

**Tabla `cashier_settlements`** (liquidaciones por porcentaje)

- id (PK)
- cashier_id (FK → users.id)
- period_start
- period_end
- total_sales (NUMERIC)
- total_prizes_paid (NUMERIC)
- profit (NUMERIC)
- payable_amount (NUMERIC)
- status (PENDING, PAID, CANCELED)
- created_at
- paid_at (nullable)

**Tabla `chip_panels`**

- id (PK)
- cashier_id (FK → users.id)
- buy_price_per_chip (NUMERIC)
- sell_price_per_chip (NUMERIC)
- total_chips (INT)
- sold_chips (INT)
- status (OPEN, FULLY_SOLD, SETTLED)
- created_at
- settled_at (nullable)

**Tabla `recoveries`**

- id (PK)
- admin_id (FK → users.id)
- cashier_id (FK → users.id)
- related_movement_id (FK → chip_movements.id, nullable)
- amount (NUMERIC)
- recovery_mode (AUTO_DEDUCT_FROM_COMMISSION, INSTALMENTS, MANUAL, etc.)
- status (PENDING, PARTIALLY_PAID, PAID, CANCELED)
- created_at
- updated_at

**Tabla `user_game_provider_blocklist`**

- id (PK)
- user_id (FK → users.id, jugador)
- provider_id (identificador del proveedor de juego)
- blocked_by (FK → users.id, cajero/admin)
- created_at

---

## 8. Flujos Clave

### 8.1 Alta de Usuario y Jerarquía

1. Se bootstrappea el Dueño en la base (script inicial).
2. El Dueño crea Administrador A.
3. Administrador A crea Cajero X.
4. Cajero X crea Jugador 1.
5. Cada nueva creación:
   - Setea `parent_user_id` al usuario que lo creó.
   - Inicializa su saldo en `balances` con 0 fichas.

### 8.2 Venta de Fichas a Jugador

1. Jugador solicita fichas al Cajero que lo registró.
2. El Cajero ingresa:
   - Jugador.
   - Cantidad de fichas.
3. El sistema:
   - Crea movimiento en `chip_movements` para el jugador (tipo `SELL_TO_PLAYER`, cantidad positiva).
   - Actualiza saldo del jugador (`balances`).
   - (Opcional según modelo) registra impacto sobre stock del cajero.

### 8.3 Pago de Premio a Jugador

1. Jugador tiene resultado ganador.
2. Según la simulación, se determina el premio en fichas.
3. El Cajero registra el premio:
   - Jugador.
   - Cantidad de fichas equivalentes al premio.
4. El sistema:
   - Acredita fichas al jugador (movimiento `PRIZE`, positivo).
   - Si el jugador “cobra” el premio en efectivo:
     - Se registra movimiento `WITHDRAWAL` (negativo) en fichas del jugador.
     - Se registra movimiento correspondiente a nivel cajero para contabilidad de premios.

### 8.4 Recupero

1. Cajero no tiene fondos para afrontar un premio.
2. Solicita asistencia al Administrador.
3. Administrador aprueba un recupero por un monto determinado.
4. El sistema:
   - Registra un `recovery` con:
     - admin_id.
     - cashier_id.
     - amount.
     - recovery_mode (MVP: AUTO_DEDUCT_FROM_COMMISSION).
   - Opcionalmente vincula el `related_movement_id` al pago de premio.
5. Cuando se genera la próxima liquidación del cajero:
   - El sistema descuenta parcial o totalmente el recupero según `recovery_mode`.
   - Actualiza el estado del recupero (PARTIALLY_PAID / PAID).

---

## 9. Requisitos No Funcionales

### 9.1 Tecnologías

- **Frontend:** React + TypeScript.
- **Backend:** Node.js + Express + TypeScript.
- **Base de datos:** PostgreSQL.
- **Autenticación:** JWT + sesiones.

### 9.2 Autenticación y Sesiones

- **JWT de acceso** de corta duración.
- **Refresh token** almacenado de forma segura (cookie HTTP-only).
- Tabla `sessions` (opcional) para:
  - Mantener control de sesiones activas.
  - Invalidar sesiones cuando un usuario es bloqueado.

### 9.3 Seguridad

- Hash de contraseñas con bcrypt o similar.
- Middlewares de autorización por rol.
- Auditoría de:
  - Cambios de contraseñas.
  - Bloqueos/desbloqueos.
  - Altas/bajas de usuarios.
  - Operaciones de recupero.

### 9.4 Performance y Disponibilidad

- Carga esperada: operaciones humanas (no masivo B2C).
- Base de datos con backups periódicos.
- Manejo transaccional de operaciones sensibles:
  - Actualización de saldos.
  - Liquidaciones.
  - Recuperos.

---

## 10. Métricas y Reporting (MVP)

- Número de usuarios por rol.
- Saldo total en fichas por nivel (global, por administrador, por cajero).
- Volumen de fichas vendidas por cajero y por período.
- Monto de premios pagados por cajero.
- Ganancia por cajero (por porcentaje / por panel).
- Monto total pendiente en recuperos por administrador y por cajero.

---

## 11. Supuestos y Temas Abiertos

- El sistema se utiliza inicialmente para **un solo casino** (single-tenant).
- Regulaciones específicas (KYC/AML, normativa local de juego) podrían requerir ajustes futuros.
- La definición exacta de “semana” para la liquidación debe ser acordada con el cliente.
- La estrategia de simulación de resultados de juego (manual vs motor demo) debe definirse con precisión, pero no afecta las estructuras principales.
- Futuras modalidades de cobro a cajeros (fijo, mixto, bonus) y recuperos deberán añadirse sobre el modelo extensible ya planteado.

