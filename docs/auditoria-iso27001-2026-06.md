# Auditoría de Cumplimiento ISO/IEC 27001:2022 — Plataforma bets-online

**Tipo:** Auditoría de brechas (gap assessment) basada en código fuente y configuración
**Norma de referencia:** ISO/IEC 27001:2022 (cláusulas 4–10 + Anexo A, 93 controles)
**Fecha:** 2026-06-18 · **Rama auditada:** `fix/various-fixes`
**Auditor:** Revisión técnica (rol auditor ISO 27001)
**Alcance técnico:** `api` (Express/Railway), `web` y `web-admin` (Next.js/Vercel), base de datos (Supabase Postgres), almacenamiento (Supabase Storage), integración proveedor de juegos 21viral.

---

## Estado al 2026-10-04

Fase 0 (quick wins) aplicada salvo un ítem: `pnpm audit` + Dependabot + CodeQL + gitleaks en CI ✅ (`security.yml`, `codeql.yml`, `dependabot.yml`); CSP enforced en `web-admin` y HSTS / Referrer-Policy / Permissions-Policy en ambas apps ✅; audit trail de login / logout ✅ (`features/auth/auth.domain.ts` → `utils/audit.ts`); supuesto de instancia única documentado ✅ (`CLAUDE.md`, `docs/deployment.md`). **Pendiente: protección de ramas `main` / `develop` en GitHub** (OM-05): al 2026-10-04 no hay reglas ni rulesets; guía en `.github/BRANCH_PROTECTION.md`.

Fases 1 a 3 (SGSI, MFA, incidentes, backups, proveedores, PII, SIEM, BCP, auditoría interna): sin avances en el repo. nc-04 (revocación dependiente de caché en memoria) sigue vigente por diseño mientras la API sea una sola instancia.

---

## 1. Alcance, metodología y limitaciones

### 1.1 Metodología
Revisión de los controles del **Anexo A** evidenciables en el repositorio: arquitectura, autenticación/sesiones, autorización, criptografía, manejo de secretos, validación de entrada, registro/auditoría, CI/CD y configuración de despliegue. Cada hallazgo se mapea a la cláusula o control ISO correspondiente, con evidencia (`archivo:línea`), riesgo y recomendación.

### 1.2 Limitaciones del alcance (IMPORTANTE)
> Una **base de código no se certifica** en ISO 27001; lo que se certifica es el **Sistema de Gestión de Seguridad de la Información (SGSI)** de la organización. Esta auditoría evalúa principalmente los controles **técnicos (Anexo A.8)** y operativos evidenciables en el repositorio, e **identifica las brechas del sistema de gestión** (cláusulas 4–10) que requieren documentación y entrevistas para cerrarse.

No fueron verificables desde el repositorio y requieren revisión documental / entrevistas:
- Controles **físicos** (A.7.*) — heredados de los proveedores cloud (Supabase, Railway, Vercel).
- Controles de **personas** (A.6.*) — concienciación, acuerdos de confidencialidad, alta/baja de personal.
- **Gobierno del SGSI** (cláusulas 4–10) — contexto, liderazgo, evaluación de riesgos, auditoría interna, revisión por la dirección.

### 1.3 Naturaleza del negocio
Plataforma de gestión de casino con **jerarquía de operadores** (OWNER → ADMIN → CASHIER → PLAYER) que mueve **saldo de fichas con valor económico**. Esto eleva la criticidad de: integridad transaccional, trazabilidad (auditoría), control de acceso por jerarquía y protección de datos personales (PII) y financieros.

---

## 2. Resumen ejecutivo

**Veredicto:** La **postura técnica de seguridad de la aplicación es sólida y madura** — superior a la media de plataformas comparables. Los hallazgos de seguridad de aplicación señalados en el informe previo (2026-06-11) están **mayormente remediados** en esta rama. Sin embargo, **la organización NO está en condiciones de certificar ISO 27001** porque **el SGSI (cláusulas 4–10) no existe de forma documentada**: no hay evaluación de riesgos, política de seguridad, inventario de activos, gestión de proveedores ni plan de respuesta a incidentes.

**Conclusión:** brecha **baja-media en controles técnicos**, brecha **alta en sistema de gestión**. El camino a certificación es fundamentalmente **documental y de proceso**, no de reingeniería de código.

### 2.1 Madurez por dominio

| Dominio ISO | Estado | Madurez |
|---|---|---|
| A.8 Controles tecnológicos (app sec) | Sólido, con mejoras puntuales | 🟢 Alta |
| A.5.15–5.18 Control de acceso (RBAC/jerarquía) | Bien implementado en código | 🟢 Alta |
| A.8.24 Criptografía | Correcta (timing-safe, HMAC, bcrypt) | 🟢 Alta |
| A.8.15 Registro / auditoría | Trail implementado; falta monitoreo/retención | 🟠 Media |
| A.8.8 Gestión de vulnerabilidades técnicas | Sin escaneo automatizado | 🟠 Media |
| A.8.5 Autenticación segura | Robusta salvo **MFA ausente** | 🟠 Media |
| Cláusulas 4–10 (SGSI) | No documentado | 🔴 Baja |
| A.5.9/5.12 Inventario y clasificación de activos | Inexistente | 🔴 Baja |
| A.5.19–5.23 Proveedores / cloud | Sin gestión formal | 🔴 Baja |
| A.5.24 Gestión de incidentes | Sin plan | 🔴 Baja |
| A.5.30/A.8.13 Continuidad / backup | Sin RTO/RPO ni prueba de restore | 🔴 Baja |
| A.5.34/A.8.10 Privacidad / PII | Sin política ni retención/borrado | 🔴 Baja |

### 2.2 Conteo de hallazgos

| Severidad | Cantidad |
|---|---|
| 🔴 No Conformidad Mayor (NC-M) | 8 |
| 🟠 No Conformidad menor (nc) | 5 |
| 🟡 Oportunidad de Mejora (OM) | 6 |

---

## 3. Fortalezas verificadas (mantener)

Evidencia de controles **bien implementados** — deben conservarse y documentarse como parte del SoA:

- **A.8.5 / A.5.17** — Cookies de sesión `httpOnly + secure + sameSite:strict`; refresh con rotación y ventana de gracia para tabs concurrentes; ventana de inactividad de 30 min server-side. (`auth.middleware.ts`, `auth.domain.ts`)
- **A.8.5** — *Throttle por cuenta* con backoff exponencial (30s→30m) **además** del rate-limit por IP — mitiga ataques distribuidos y CGNAT. (`utils/login-throttle.ts`)
- **A.8.24** — Comparaciones `crypto.timingSafeEqual` en CSRF y HMAC; HMAC-SHA256 con validación de formato y ventana temporal; `crypto.randomBytes(32)` para tokens CSRF; bcrypt para contraseñas. (`server.ts:70`, `hmac.middleware.ts`)
- **A.5.15–5.18 / A.8.3** — Autorización por **subárbol jerárquico** (CTE recursivo) + verificación de jerarquía de roles en **toda** operación de fichas. (`chips.domain.ts`, `users.repository.ts`)
- **A.8.28 (codificación segura)** — Todas las consultas SQL crudas usan *bind parameters* (`replacements`) — **sin interpolación** → sin SQLi detectado. Roles validados contra whitelist antes de usarse. (`users.repository.ts:195,236,258,280`)
- **Integridad transaccional** — Movimientos de fichas con transacción DB + *row locks* (`findByUserIdWithLock` = `SELECT ... FOR UPDATE`), incrementos atómicos e **idempotencia** por clave. (`chips.domain.ts`)
- **A.8.12 (fuga de datos)** — `passwordHash` aislado en métodos `*ForAuth`; mappers lo excluyen; sin `SELECT *` sobre `users`; tokens **no** almacenados en `localStorage` (solo cookies httpOnly); sin `dangerouslySetInnerHTML` en el front.
- **A.8.15** — *Audit trail* (`audit_logs`) escrito en cargas/retiros/premios/pérdidas de fichas, cambios de settings y altas/bloqueos/resets de usuarios, con IP y user-agent vía `AsyncLocalStorage`. (`utils/audit.ts`, `chips.domain.ts`, `users.domain.ts`, `settings.domain.ts`)
- **A.8.9 (configuración)** — Variables de entorno **validadas con Zod al arranque** (secretos JWT ≥32 chars obligatorios); el proceso no arranca con configuración inválida. (`config/envs.ts`)
- **A.8.26** — Cabeceras de seguridad: `helmet()` en API; **CSP** definida en ambos frontends (modo Report-Only); `frame-ancestors` anti-clickjacking.
- **A.8.31/A.8.32** — Entornos separados (preview/prod), CI con lint+type-check+build+tests, *pre-commit hooks* (Husky), regla de protección de ramas documentada.
- **A.5.23** — `.env` fuera de control de versiones (`.gitignore`); solo se versionan `*.example`.

---

## 4. Hallazgos del Sistema de Gestión (Cláusulas 4–10) — No Conformidades Mayores

> Estas brechas son las que **impiden la certificación**. Son de naturaleza documental/proceso.

### NC-M-01 — Ausencia de SGSI documentado (Cl. 4–6, A.5.1)
**Riesgo: Alto.** No existe alcance del SGSI, política de seguridad de la información, ni **metodología de evaluación y tratamiento de riesgos**, ni **registro de riesgos**, ni **Declaración de Aplicabilidad (SoA)**. Son el núcleo obligatorio de la norma.
**Recomendación:** definir alcance, aprobar política de seguridad por la dirección, adoptar metodología de riesgos (p. ej. ISO 27005), levantar registro de riesgos y producir SoA sobre los 93 controles.

### NC-M-02 — Sin inventario ni clasificación de activos de información (A.5.9, A.5.12)
**Riesgo: Alto.** No hay inventario de activos (datos de PII de jugadores, credenciales, registros financieros de fichas, secretos, claves de integración) con propietario y nivel de clasificación.
**Recomendación:** inventario de activos + esquema de clasificación (p. ej. Público/Interno/Confidencial/Restringido) y asignación de propietarios.

### NC-M-03 — Sin gestión de seguridad de proveedores / cloud (A.5.19, A.5.20, A.5.23)
**Riesgo: Alto.** Supabase, Railway, Vercel y **21viral** son proveedores críticos (procesan datos y dinero) sin due diligence documentada, **acuerdo de tratamiento de datos (DPA)**, SLA ni **matriz de responsabilidad compartida** de seguridad cloud.
**Recomendación:** registro de proveedores, evaluación de riesgo por proveedor, DPA/cláusulas de seguridad y matriz de responsabilidades.

### NC-M-04 — Sin plan de gestión de incidentes ni canal de reporte (A.5.24–5.28, A.6.8)
**Riesgo: Alto.** No hay procedimiento de respuesta a incidentes, roles, escalamiento, ni canal para reportar eventos de seguridad; tampoco manejo/retención de evidencia.
**Recomendación:** plan de respuesta a incidentes (detección→contención→erradicación→recuperación→lecciones), canal de reporte y plantillas de registro de evidencia.

### NC-M-05 — Continuidad de negocio y backups sin gobierno (A.5.30, A.8.13)
**Riesgo: Alto.** La continuidad descansa en backups gestionados de Supabase **sin RTO/RPO definidos, sin prueba de restauración documentada y sin plan DR**. Para una plataforma que mueve dinero, una restauración fallida es pérdida directa.
**Recomendación:** definir RTO/RPO, documentar política de backup, **ejecutar y registrar una prueba de restore**, y un plan DR mínimo.

### NC-M-06 — Privacidad / protección de PII sin tratar (A.5.34, A.8.10, A.5.31)
**Riesgo: Alto.** Se procesan PII de jugadores (usuario, email, nombre, IP y user-agent en `audit_logs`) **sin** aviso de privacidad, **sin política de retención/borrado** (A.8.10) ni registro de actividades de tratamiento. Para el rubro juego, además aplican requisitos legales/regulatorios (licenciamiento, AML/KYC, verificación de edad) **a confirmar con asesoría legal** — no se observó lógica de KYC/AML/edad en el código.
**Recomendación:** aviso de privacidad, política de retención y borrado de datos, registro de tratamiento; confirmar marco regulatorio del negocio y, si aplica, requisitos KYC/AML/edad.

### NC-M-07 — Roles, responsabilidades y segregación de funciones no formalizados (A.5.2, A.5.3, A.8.2)
**Riesgo: Medio.** El RBAC está bien resuelto en código, pero **no hay política de control de acceso documentada**, ni gobierno de **accesos privilegiados** (OWNER/ADMIN), ni **revisión periódica de accesos**, ni segregación de funciones documentada.
**Recomendación:** política de control de acceso, registro de cuentas privilegiadas, revisión de accesos trimestral, matriz de segregación de funciones.

### NC-M-08 — Sin procedimientos operativos ni concienciación (A.5.37, A.6.3)
**Riesgo: Medio.** No hay *runbooks* (rotación de claves, onboarding/offboarding, respuesta a incidentes) ni programa de concienciación/formación en seguridad para el personal con acceso.
**Recomendación:** documentar procedimientos operativos clave y establecer formación anual de seguridad.

---

## 5. Hallazgos de Controles del Anexo A (técnicos/operativos)

### nc-01 — Sin MFA para cuentas privilegiadas (A.8.5)
**Riesgo: Alto.** Autenticación **solo con contraseña** para roles que controlan dinero (OWNER/ADMIN). No se encontró TOTP/MFA en el código.
**Mitigación:** MFA (TOTP) obligatorio para OWNER y ADMIN; opcional para CASHIER. Mientras tanto: alertar sobre login privilegiado desde IP/dispositivo nuevo.

### nc-02 — Sin gestión automatizada de vulnerabilidades técnicas (A.8.8)
**Riesgo: Medio.** El CI no ejecuta **auditoría de dependencias** (`pnpm audit`), no hay **Dependabot/Renovate**, ni **SAST** (CodeQL/Semgrep), ni **escaneo de secretos** (gitleaks). Sin proceso, las CVEs de dependencias pasan inadvertidas. (`/.github/workflows/ci.yml`, sin `dependabot.yml`)
**Mitigación:** agregar `pnpm audit --audit-level=high` al CI, habilitar Dependabot, CodeQL y gitleaks como *checks* de PR.

### nc-03 — Registro sin monitoreo, alertas ni retención (A.8.15, A.8.16)
**Riesgo: Medio.** Hay logging estructurado (pino) y *audit trail*, pero los logs van a stdout **sin centralización (SIEM), sin alertas** (p. ej. picos de 403/CSRF, ráfagas de movimientos de fichas, logins fallidos privilegiados) **ni política de retención**. La escritura de auditoría es *fire-and-forget* (puede perderse en fallo) y la tabla no es append-only/anti-manipulación. Los **eventos de autenticación** (login OK/fallido, logout) **no** se registran en `audit_logs`.
**Mitigación:** centralizar logs con retención definida (p. ej. 1 año para auditoría), alertas sobre eventos clave, extender el audit trail a eventos de autenticación y proteger la integridad del registro (A.5.33).

### nc-04 — Revocación de acceso dependiente de caché en memoria de una sola instancia (A.8.5, A.5.18)
**Riesgo: Medio.** El bloqueo inmediato de un usuario depende de `userCache` (Map en memoria, **una sola instancia**). Si la API escala horizontalmente, la revocación deja de ser fiable y el access token *stateless* sigue válido ≤15 min. Hoy es una decisión aceptada para una instancia, pero **no está documentada como restricción arquitectónica**.
**Mitigación:** documentar la suposición de instancia única; si se escala, mover la lista de revocación/caché a almacén compartido (Redis) o introducir versión de token.

### nc-05 — CSP en Report-Only y cabeceras de seguridad incompletas en los frontends (A.8.26)
**Riesgo: Bajo-Medio.** La CSP de ambos frontends está en `Content-Security-Policy-Report-Only` (no **bloquea**). Faltan `Strict-Transport-Security` (HSTS), `Referrer-Policy` y `Permissions-Policy` en las apps Next; `script-src` permite `'unsafe-inline'`/`'unsafe-eval'`. (`web/next.config.mjs`, `web-admin/next.config.mjs`)
**Mitigación:** promover `web-admin` a CSP *enforce* (no embebe iframes de terceros) ya; agregar HSTS/Referrer-Policy/Permissions-Policy; verificar HSTS en los dominios públicos de Vercel; planificar nonces para eliminar `unsafe-inline` en `web`.

### Oportunidades de Mejora (OM)

| ID | Control | Hallazgo | Mitigación |
|---|---|---|---|
| OM-01 | A.8.29 | Rutas críticas sin pruebas automatizadas: autorización por subárbol/jerarquía, middleware CSRF, throttle de login y flujos de auth. `test-web` es un *no-op* (`\|\| echo "No tests configured yet"`); sin umbral de cobertura. | Añadir tests de seguridad (authz, CSRF, throttle) y *gate* de cobertura en CI. |
| OM-02 | A.8.24 | `bcrypt` con coste 10. Aceptable; 12 da más margen ante hardware moderno. | Subir a 12 si la latencia de login lo permite. |
| OM-03 | A.5.23 | `frame-src https:` en `web` permite **cualquier** iframe HTTPS (ya anotado en el código a la espera de los dominios de proveedores). | Acotar `frame-src` a los dominios de los proveedores de juego una vez confirmados. |
| OM-04 | A.8.2 | Sin deshabilitación automática de cuentas inactivas ni revisión de cuentas privilegiadas huérfanas. | Revisión periódica + baja de cuentas inactivas. |
| OM-05 | A.8.32 | La regla "nunca commitear a `main`/`develop`" vive en `CLAUDE.md` (convención). | Verificar que la **protección de ramas esté forzada** en GitHub (no solo convención). |
| OM-06 | A.5.7 | Sin proceso de *threat intelligence* / seguimiento de avisos de seguridad de Supabase/Vercel/Railway/21viral. | Suscribir avisos de proveedores y revisar CVEs periódicamente. |

---

## 6. Matriz de hallazgos

| ID | Severidad | Riesgo | Control ISO | Resumen |
|---|---|---|---|---|
| NC-M-01 | 🔴 Mayor | Alto | Cl.4–6 / A.5.1 | Sin SGSI: riesgos, política, SoA |
| NC-M-02 | 🔴 Mayor | Alto | A.5.9 / A.5.12 | Sin inventario ni clasificación de activos |
| NC-M-03 | 🔴 Mayor | Alto | A.5.19/5.20/5.23 | Sin gestión de proveedores/cloud |
| NC-M-04 | 🔴 Mayor | Alto | A.5.24–5.28 | Sin plan de incidentes |
| NC-M-05 | 🔴 Mayor | Alto | A.5.30 / A.8.13 | Continuidad/backup sin RTO/RPO ni prueba |
| NC-M-06 | 🔴 Mayor | Alto | A.5.34 / A.8.10 / A.5.31 | PII/privacidad/regulatorio sin tratar |
| NC-M-07 | 🔴 Mayor | Medio | A.5.2/5.3 / A.8.2 | Roles/segregación/accesos sin formalizar |
| NC-M-08 | 🔴 Mayor | Medio | A.5.37 / A.6.3 | Sin procedimientos ni concienciación |
| nc-01 | 🟠 menor | Alto | A.8.5 | Sin MFA para OWNER/ADMIN |
| nc-02 | 🟠 menor | Medio | A.8.8 | Sin escaneo de dependencias/SAST/secretos en CI |
| nc-03 | 🟠 menor | Medio | A.8.15 / A.8.16 | Logs sin monitoreo/alertas/retención |
| nc-04 | 🟠 menor | Medio | A.8.5 / A.5.18 | Revocación atada a caché de instancia única |
| nc-05 | 🟠 menor | Bajo-Medio | A.8.26 | CSP Report-Only; faltan HSTS/Referrer/Permissions |
| OM-01..06 | 🟡 OM | Bajo | varios | Ver tabla §5 |

---

## 7. Plan de remediación y mitigación

Prioridad por **riesgo × esfuerzo**. Responsables sugeridos: **Dev** (equipo desarrollo), **DevOps**, **CISO/Resp. Seguridad**, **Dirección**, **Legal**.

### Fase 0 — Quick wins técnicos (≤ 1 semana)
| Acción | Hallazgo | Control | Resp. | Esfuerzo |
|---|---|---|---|---|
| Añadir `pnpm audit --audit-level=high` + Dependabot + CodeQL + gitleaks al CI | nc-02 | A.8.8 | DevOps | Bajo |
| Forzar protección de ramas `main`/`develop` en GitHub (revisión obligatoria, status checks) | OM-05 | A.8.32 | DevOps | Bajo |
| Promover CSP a *enforce* en `web-admin`; agregar HSTS, Referrer-Policy, Permissions-Policy en ambas apps | nc-05 | A.8.26 | Dev | Bajo |
| Extender *audit trail* a eventos de autenticación (login OK/fallido, logout) | nc-03 | A.8.15 | Dev | Bajo |
| Documentar la suposición de **instancia única** para la revocación | nc-04 | A.5.18 | Dev | Bajo |

### Fase 1 — Núcleo del SGSI + auth (≤ 30 días)
| Acción | Hallazgo | Control | Resp. | Esfuerzo |
|---|---|---|---|---|
| Definir **alcance del SGSI** y aprobar **Política de Seguridad** | NC-M-01 | A.5.1 | Dirección/CISO | Medio |
| **Inventario de activos** + esquema de **clasificación** + propietarios | NC-M-02 | A.5.9/5.12 | CISO | Medio |
| **Metodología de riesgos** + **registro de riesgos** + **SoA** preliminar | NC-M-01 | Cl.6.1 | CISO | Alto |
| **MFA (TOTP)** obligatorio para OWNER/ADMIN | nc-01 | A.8.5 | Dev | Medio |
| **Plan de respuesta a incidentes** + canal de reporte | NC-M-04 | A.5.24 | CISO | Medio |
| Política de **backup** + **prueba de restore documentada** (RTO/RPO) | NC-M-05 | A.8.13 | DevOps | Medio |

### Fase 2 — Datos, proveedores y operación (≤ 60 días)
| Acción | Hallazgo | Control | Resp. | Esfuerzo |
|---|---|---|---|---|
| Registro de **proveedores** + DPA + matriz de responsabilidad cloud | NC-M-03 | A.5.19–5.23 | CISO/Legal | Medio |
| **Aviso de privacidad** + política de **retención/borrado** de PII | NC-M-06 | A.5.34/A.8.10 | Legal/CISO | Medio |
| Confirmar marco **regulatorio** del negocio (juego: licencia/AML/KYC/edad) | NC-M-06 | A.5.31 | Legal/Dirección | Medio |
| Política de **control de acceso** + **revisión periódica** de accesos privilegiados | NC-M-07 | A.5.15/A.8.2 | CISO | Medio |
| **Centralización de logs** (SIEM) + alertas + retención | nc-03 | A.8.16 | DevOps | Medio |
| **Tests de seguridad** (authz, CSRF, throttle) + *gate* de cobertura | OM-01 | A.8.29 | Dev | Medio |

### Fase 3 — Madurez y pre-certificación (≤ 90 días)
| Acción | Hallazgo | Control | Resp. | Esfuerzo |
|---|---|---|---|---|
| **BCP/DR** documentado y probado | NC-M-05 | A.5.30 | CISO/DevOps | Alto |
| **Procedimientos operativos** (runbooks) + **concienciación** anual | NC-M-08 | A.5.37/A.6.3 | CISO | Medio |
| Promover CSP *enforce* en `web` (nonces; eliminar `unsafe-inline`) | nc-05 | A.8.26 | Dev | Medio |
| Acotar `frame-src`, bcrypt→12, threat-intel de proveedores | OM-02/03/06 | varios | Dev | Bajo |
| **Auditoría interna** (Cl.9.2) + **revisión por la dirección** (Cl.9.3) | Cl.9 | — | CISO/Dirección | Medio |

---

## 8. Anexo A — Estado preliminar por control (resumen para SoA)

| Control Anexo A | Estado | Evidencia / Nota |
|---|---|---|
| A.5.1 Políticas | ❌ Ausente | Sin política documentada |
| A.5.2/5.3 Roles / segregación | ⚠️ Parcial | RBAC en código; sin política |
| A.5.7 Threat intelligence | ❌ Ausente | OM-06 |
| A.5.9/5.12 Inventario / clasificación | ❌ Ausente | NC-M-02 |
| A.5.15–5.18 Control de acceso / identidad / autenticación / derechos | 🟢 Fuerte (código) / ⚠️ sin política | Jerarquía + subárbol; sin revisión de accesos |
| A.5.19–5.23 Proveedores / cloud | ❌ Ausente | NC-M-03 |
| A.5.24–5.28 Incidentes | ❌ Ausente | NC-M-04 |
| A.5.30 Continuidad TIC | ❌ Ausente | NC-M-05 |
| A.5.31 Requisitos legales/regulatorios | ❌ Ausente | NC-M-06 |
| A.5.33 Protección de registros | ⚠️ Parcial | Audit trail sin anti-manipulación/retención |
| A.5.34 Privacidad/PII | ❌ Ausente | NC-M-06 |
| A.5.37 Procedimientos operativos | ❌ Ausente | NC-M-08 |
| A.6.3 Concienciación | ❌ Ausente | NC-M-08 |
| A.6.8 Reporte de eventos | ❌ Ausente | NC-M-04 |
| A.7.* Físicos | ➖ Heredado | Cloud (Supabase/Railway/Vercel) — requiere evidencia del proveedor |
| A.8.2 Accesos privilegiados | ⚠️ Parcial | RBAC sí; sin MFA ni revisión |
| A.8.3 Restricción de acceso a información | 🟢 Fuerte | Autorización por subárbol/rol |
| A.8.4 Acceso al código fuente | ⚠️ Verificar | Protección de ramas a confirmar (OM-05) |
| A.8.5 Autenticación segura | ⚠️ Parcial | Robusta; **sin MFA** (nc-01) |
| A.8.8 Vulnerabilidades técnicas | ❌ Ausente | nc-02 |
| A.8.9 Gestión de configuración | 🟢 Bien | Validación Zod de entorno |
| A.8.10 Borrado de información | ❌ Ausente | Sin retención/borrado PII |
| A.8.12 Prevención de fuga | 🟢 Bien | passwordHash aislado; sin SELECT * |
| A.8.13 Backup | ⚠️ Parcial | Gestionado por proveedor; sin prueba de restore |
| A.8.15/8.16 Registro / monitoreo | ⚠️ Parcial | Trail sí; sin SIEM/alertas/retención (nc-03) |
| A.8.17 Sincronización de reloj | ⚠️ Verificar | Tolerancia HMAC ±300s; NTP del host a confirmar |
| A.8.24 Criptografía | 🟢 Fuerte | timing-safe, HMAC-SHA256, bcrypt, randomBytes |
| A.8.25–8.28 Desarrollo seguro | 🟢 Bien | Parametrización SQL, validación Zod, CI |
| A.8.29 Pruebas de seguridad | ⚠️ Parcial | Tests existen; faltan de seguridad (OM-01) |
| A.8.31/8.32 Separación de entornos / cambios | 🟢 Bien | preview/prod, PR+CI+Husky |

Leyenda: 🟢 conforme · ⚠️ parcial · ❌ ausente · ➖ heredado/N-A.

---

## 9. Anexo B — Registro de riesgos inicial (Top 7)

| # | Riesgo | Prob. | Impacto | Tratamiento sugerido |
|---|---|---|---|---|
| R1 | Toma de cuenta OWNER/ADMIN por phishing/credencial (sin MFA) → robo de fichas | Media | Crítico | Mitigar: MFA (nc-01) + alertas de login |
| R2 | Pérdida de datos sin restore probado | Baja | Crítico | Mitigar: prueba de restore + RTO/RPO (NC-M-05) |
| R3 | CVE en dependencia no detectada | Media | Alto | Mitigar: audit/Dependabot/CodeQL (nc-02) |
| R4 | Incidente sin capacidad de respuesta/detección | Media | Alto | Mitigar: plan de incidentes + SIEM (NC-M-04, nc-03) |
| R5 | Incumplimiento legal de PII / regulatorio de juego | Media | Alto | Mitigar/Transferir: privacidad + asesoría legal (NC-M-06) |
| R6 | Dependencia de proveedor cloud sin DPA/SLA | Media | Alto | Transferir/Mitigar: contratos + due diligence (NC-M-03) |
| R7 | Revocación de sesión falla si se escala horizontalmente | Baja | Medio | Mitigar: store compartido o documentar restricción (nc-04) |

---

*Este informe es un diagnóstico de brechas y no constituye una auditoría de certificación formal. La certificación ISO/IEC 27001 requiere un SGSI operativo, evidencia de al menos un ciclo de auditoría interna y revisión por la dirección, y la intervención de un organismo de certificación acreditado.*
