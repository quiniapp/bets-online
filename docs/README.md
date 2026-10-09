# docs/

Índice. Empezá por el `README.md` de la raíz y por `CLAUDE.md` (arquitectura y reglas, pensado para personas y LLMs).

## Guías operativas (mantener al día)

| Doc | Qué cubre |
|---|---|
| [environment-variables.md](./environment-variables.md) | Todas las variables de `api`, `web` y `web-admin`; local, CI, Railway, Vercel; conexión a Supabase |
| [deployment.md](./deployment.md) | Topología, Railway, Vercel, qué hace cada workflow de GitHub Actions, branch protection, checklist de entorno nuevo |
| [frontend.md](./frontend.md) | `web` vs `web-admin`, estructura, `api.service` (CSRF, cookies), cómo agregar páginas |
| [../api/src/persistence/migrations/README.md](../api/src/persistence/migrations/README.md) | Migraciones y seeds con Sequelize CLI |
| [../api/src/config/README.md](../api/src/config/README.md) | Cómo la API carga y valida su configuración |
| [../.github/README.md](../.github/README.md) | Workflows y template de PR |
| [../.github/BRANCH_PROTECTION.md](../.github/BRANCH_PROTECTION.md) | Cómo proteger `main` y `develop` en GitHub |

## Referencia técnica

| Doc | Qué cubre |
|---|---|
| [rfc8785-hmac-sha256.md](./rfc8785-hmac-sha256.md) | Canonicalización JSON + HMAC usada en los callbacks de 21Viral |
| [21viral-configuracion-operador.md](./21viral-configuracion-operador.md) | Qué se configura de nuestro lado vs. del lado de 21Viral; gap analysis y pedidos al account manager |

## Informes

Foto de una fecha. Cada uno tiene arriba una sección "Estado" con lo que ya se aplicó y lo pendiente.

| Doc | Fecha |
|---|---|
| [informe-seguridad-2026-06.md](./informe-seguridad-2026-06.md) | 2026-06-11 |
| [informe-performance-2026-06.md](./informe-performance-2026-06.md) | 2026-06-11 |
| [auditoria-iso27001-2026-06.md](./auditoria-iso27001-2026-06.md) | 2026-06-18 |

## Histórico y backlog

- [casino-prd.md](./casino-prd.md): PRD original (2025-11). Jerarquía, fichas y reportes se implementaron; compensación de cajeros, liquidaciones y recuperos tienen tablas pero no lógica ni endpoints.
- [superpowers/specs/](./superpowers/specs/): diseños de features ya implementadas (flujo de fichas, banners estáticos). Sirven para entender el porqué; el código manda.
- [backlog/](./backlog/): ideas diferidas (API de preview por PR en Railway, `rotateTokens` con JOIN, SEO).
- [CHANGELOG_THEME_BRANCH.md](./CHANGELOG_THEME_BRANCH.md): resumen de la implementación del tema seleccionable (`light`/`dark`/`casino`) y de la sincronización centralizada del tema.
- Cualquier carpeta llamada `plans/` está en `.gitignore`: los planes de implementación son locales y no se commitean.
