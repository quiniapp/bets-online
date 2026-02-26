# Mejoras de UX en Gestión de Usuarios

**Fecha:** 2026-02-01
**Tipo:** Mejora de UX/UI
**Componentes afectados:** Formularios de creación de usuarios, Lista de usuarios, Terminología

## Resumen

Tres mejoras enfocadas en mejorar la experiencia de usuario para administradores y cajeros:

1. **Toggle de visibilidad en todos los campos de contraseña**
2. **Modal de detalle rápido de usuario con acceso directo a operaciones de fichas**
3. **Cambio de terminología de "chips" a "fichas"**

## Mejora 1: Ojito en Todos los Inputs de Password

### Problema
Los campos de "Confirmar Contraseña" en las pantallas de crear admin y crear manager usan `ValidatedInput` con `type="password"`, lo que no incluye el toggle de visibilidad (ojito).

### Solución
Reemplazar `ValidatedInput` por `PasswordInput` en los campos de confirmación de contraseña.

### Archivos a modificar
1. `web/feature/pages/create-admin.tsx` (línea 237-246)
2. `web/app/admin/users/create-manager/page.tsx` (línea 324-338)

### Implementación

**Antes:**
```tsx
<ValidatedInput
  id="confirmPassword"
  type="password"
  value={formData.confirmPassword}
  onChange={...}
  validationState={...}
  errorMessage={...}
/>
```

**Después:**
```tsx
<PasswordInput
  id="confirmPassword"
  value={formData.confirmPassword}
  onChange={...}
  onBlur={...}
  placeholder="Repite la contrasena"
  showRequirements={false}
/>
{touched.confirmPassword && confirmPasswordValidation.state === 'invalid' && (
  <p className="text-sm text-red-500">{confirmPasswordValidation.message}</p>
)}
```

### Criterios de aceptación
- ✅ Campo de confirmar contraseña tiene ojito en crear admin
- ✅ Campo de confirmar contraseña tiene ojito en crear manager
- ✅ Campo de confirmar contraseña tiene ojito en crear usuario (ya implementado)
- ✅ Validación de coincidencia de contraseñas sigue funcionando
- ✅ Mensajes de error se muestran correctamente

---

## Mejora 2: Modal de Detalle al Hacer Clic en Usuario

### Problema
Para cargar/descargar fichas a un usuario, el administrador/cajero debe usar los botones pequeños en la tabla. En móvil esto es poco intuitivo y requiere precisión.

### Solución
Crear un modal de detalle que se abre al hacer clic en la fila del usuario, mostrando:
- Información del usuario (nombre completo, username, email, balance actual)
- Botones principales de Cargar/Retirar fichas
- Historial de los últimos 5 movimientos

### Nuevo componente
`web/components/admin/user-detail-dialog.tsx`

### Características del componente
```tsx
interface UserDetailDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOperationSuccess?: () => void
}
```

**Estructura:**
1. **Header**: Nombre de usuario y badge de estado (activo/inactivo)
2. **Sección de información**:
   - Nombre completo
   - Email
   - Balance actual de fichas
   - Fecha de registro
   - Última conexión
3. **Botones de acción**:
   - Cargar Fichas (botón primario)
   - Retirar Fichas (botón secundario)
4. **Historial**: Tabla con últimos 5 movimientos usando `ChipMovementsTable`

**Comportamiento:**
- Al hacer clic en "Cargar Fichas" o "Retirar Fichas", se abre el `ChipOperationDialog` correspondiente
- El modal de detalle permanece abierto en segundo plano
- Al completar una operación, se actualiza el balance y el historial

### Cambios en lista de usuarios
**Archivo:** `web/app/admin/users/page.tsx`

**Modificaciones:**
1. Agregar estado para controlar el modal de detalle
2. Hacer clickeable la fila del usuario (agregar `onClick` y estilos de cursor)
3. Mantener los botones de acción existentes
4. Agregar el componente `UserDetailDialog`

### Diseño responsive
- **Mobile**: Modal ocupa toda la pantalla (100vw, 100vh)
- **Desktop**: Modal centrado con max-width de 800px

### Criterios de aceptación
- ✅ Al hacer clic en una fila de usuario, se abre el modal de detalle
- ✅ Modal muestra información correcta del usuario
- ✅ Balance de fichas se muestra actualizado
- ✅ Botones de Cargar/Retirar abren los diálogos correspondientes
- ✅ Historial muestra los últimos 5 movimientos
- ✅ Modal es responsive (mobile-first)
- ✅ Los botones pequeños existentes siguen funcionando

---

## Mejora 3: Cambiar "Chips" a "Fichas"

### Problema
La terminología "chips" es en inglés, pero los usuarios hispanohablantes del casino usan el término "fichas".

### Solución
Cambiar todos los textos visibles al usuario de "chips/Chips" a "fichas/Fichas".

**IMPORTANTE:** Mantener nombres técnicos (variables, funciones, archivos) sin cambiar para evitar refactorización masiva y posibles bugs.

### Estrategia de cambios

**Solo cambiar textos UI:**
- Títulos de modales
- Labels de botones
- Tooltips
- Mensajes al usuario
- Descripciones

**NO cambiar:**
- Nombres de archivos (`chip-operation-dialog.tsx`)
- Nombres de funciones (`sellChips`, `useChips`)
- Nombres de variables
- Rutas de API
- Nombres de tablas en base de datos

### Archivos a actualizar

1. **`web/components/admin/chip-operation-dialog.tsx`**
   - "Carga de Chips" → "Carga de Fichas"
   - "Retiro de Chips" → "Retiro de Fichas"

2. **`web/components/admin/movements-history-dialog.tsx`**
   - "Historial Completo de Movimientos" (mantener, ya está bien)

3. **`web/components/admin/chip-movements-table.tsx`**
   - Verificar encabezados de tabla

4. **`web/app/admin/users/page.tsx`**
   - Tooltip: "Carga de fichas"
   - Tooltip: "Retiro de fichas"

5. **`web/app/admin/balances/page.tsx`**
   - Cualquier referencia a "chips" en UI

6. **Constantes (si existen)**
   - Buscar archivo de constantes con traducciones

### Búsqueda sistemática
```bash
# Encontrar todos los archivos con "chips" o "Chips" en textos UI
grep -r "chips\|Chips" web/components web/app --include="*.tsx" --include="*.ts"
```

### Criterios de aceptación
- ✅ Todos los textos visibles usan "fichas" en lugar de "chips"
- ✅ Tooltips actualizados
- ✅ Títulos de modales actualizados
- ✅ No se rompe ninguna funcionalidad existente
- ✅ Nombres técnicos (código) permanecen sin cambios

---

## Plan de Implementación

### Fase 1: Mejora 1 - Ojito en passwords (15 min)
1. Modificar `create-admin.tsx`
2. Modificar `create-manager/page.tsx`
3. Probar formularios de creación

### Fase 2: Mejora 3 - Terminología (20 min)
1. Buscar todas las ocurrencias de "chips" en UI
2. Reemplazar sistemáticamente
3. Verificar que no se rompió nada

### Fase 3: Mejora 2 - Modal de detalle (45 min)
1. Crear componente `UserDetailDialog`
2. Integrar con lista de usuarios
3. Probar flujo completo de operaciones
4. Validar responsive design

### Testing
- Probar en navegador de escritorio
- Probar en emulador móvil
- Verificar que todos los diálogos se abren correctamente
- Confirmar que las operaciones de fichas funcionan

---

## Notas técnicas

- El componente `PasswordInput` ya existe y funciona correctamente
- Los diálogos `ChipOperationDialog` y `MovementsHistoryDialog` ya existen
- El componente `ChipMovementsTable` soporta el parámetro `limit` para mostrar solo N movimientos
- La lista de usuarios ya tiene la infraestructura de diálogos funcionando

## Riesgos y mitigación

**Riesgo:** Cambiar terminología podría afectar traducciones o constantes compartidas
**Mitigación:** Solo cambiar textos hardcoded en componentes UI, no tocar constantes del backend

**Riesgo:** Modal de detalle podría confundir flujo existente
**Mitigación:** Mantener botones de acción rápida existentes, el modal es una opción adicional

**Riesgo:** Responsive del modal podría no funcionar bien en todos los tamaños
**Mitigación:** Usar clases de Tailwind probadas, testar en múltiples tamaños
