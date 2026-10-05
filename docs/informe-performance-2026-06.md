# Informe de Performance — bets-online

**Fecha:** 2026-06-11 · **Objetivo:** que el sitio sea rápido y ágil en teléfonos de gama baja con datos móviles (3G/4G inestable, CPU lenta, poca RAM).
**Topología relevante:** browser → Vercel (Next.js, rewrites `/api/*`) → Railway (Express, single instance) → Supabase Postgres. Cada llamada al API paga el salto extra Vercel→Railway.

## Estado al 2026-10-04

Aplicado después del informe: P1 `Cache-Control` en GETs públicos (`api/src/utils/http-cache.ts`), P2 endpoint `GET /api/lobby`, P3 un solo fetch de tipos vía `useGameTypes`, P4 resize con sharp en el upload (`api/src/utils/image-processing.ts`), P5 `preconnect` + `fetchPriority` en el hero, P6 secciones de 16 (`LOBBY_SECTION_LIMIT`), P7 índice `pg_trgm` sobre `games.name` (migración 20260611000002), P8 `compression()`, P9 `web/app/admin` eliminado, P10 GeistMono fuera, P12 `ignoreBuildErrors` fuera.

Pendiente: P11 manifest / PWA, P13 vigilancia del bundle, P14 cache en cliente (SWR / React Query).

---

## Aplicado en esta sesión (ya en la rama)

| Fix | Antes | Después |
|---|---|---|
| `logo-small.png` (header de TODAS las páginas, web y admin) | **800 KB** (1208×462) | **11 KB** (314×120) |
| `logo.png` (login/loader) | 313 KB | 13 KB |
| `logo*.png.bak` servidos públicamente | 3.7 MB en `/public` | eliminados |
| `/users/me/tree` (lista de usuarios admin) | 3 queries × usuario (cientos de queries) | 2 queries totales + armado en memoria |
| `canViewUser` (cada update/block/reset) | cargaba el subárbol completo | 1 query `EXISTS` |
| Watchdog de sesión | refresh cada 10 min aun inactivo | sin tráfico de fondo; ping solo con actividad real |

---


## Críticos (máximo impacto en gama baja + datos móviles)

### P1. Ningún endpoint público envía `Cache-Control`
Todos los GET públicos (`/games`, `/banners`, `/settings/casino`, `/games/types`, `/providers`, `/featured-games`) se sirven sin headers de cache → **cada visita re-descarga todo** y paga browser→Vercel→Railway completo, aunque el backend ya tenga esos datos en memoria.
**Fix:** en esos controllers, `res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600')` (ajustar TTL por endpoint). Doble ganancia: el browser reutiliza la respuesta, y **el edge de Vercel cachea el proxy** → para usuarios con cache hit la latencia AR↔Railway desaparece. Es el mayor ratio impacto/esfuerzo de este informe.

### P2. El lobby es 100 % client-side y dispara ~10 requests tras hidratar
`/` se prerenderiza como shell vacío; recién después de descargar/ejecutar JS se piden: settings, types (×2 — ver P3), providers, banners, featured y 1 request **por cada slot del lobby**. En un teléfono lento eso es: pantalla de esqueletos varios segundos.
**Fix por etapas:**
1. Endpoint agregado `GET /lobby` que devuelva `{settings, types, providers, featured, slots:[{slot, games}]}` en **una** respuesta (todo ya está en los memcaches del server) + `Cache-Control` de P1.
2. (Mayor) Convertir el lobby a Server Component/ISR para servir HTML con datos.

### P3. Fetch duplicado de `/games/types`
`web/app/page.tsx` y `CategoriesBar` piden el mismo recurso por separado en cada carga (y `HomeBottomNav` lo recibe por props del primero). **Fix:** levantar el fetch a un solo lugar (o SWR con dedupe). Trivial.

### P4. Imágenes de banners y logos de juegos sin redimensionar
El hero banner sube el archivo original (hasta 5 MB) a Supabase y se sirve tal cual; en mobile se muestra a 160 px de alto. Es potencialmente **el mayor consumo de datos de la home**.
**Fix:** redimensionar/convertir en el upload (sharp en la API): banners → ~1600 px ancho WebP q80 (+ variante mobile 750 px si se quiere `srcset`); logos custom de juegos → 512 px. Aplica a `game-banners`, `game-images`, `provider-logos`.

### P5. LCP sin prioridad + `images.unoptimized: true`
El LCP (primer banner) se descarga tarde (después de JS + API) y sin pista de prioridad. Las `<img>` no declaran dimensiones (el wrapper con altura fija evita CLS en hero y cards ✓).
**Fix barato sin next/image:** `fetchpriority="high"` + `decoding="async"` en el primer banner; `loading="lazy"` ya está en las cards ✓. Añadir `<link rel="preconnect">` en el layout hacia el dominio de Supabase Storage y el CDN de thumbnails del integrador (ahorra DNS+TLS, ~300-600 ms en 3G).

---

## Altos

### P6. Secciones del home: piden 30 juegos, muestran ≤16
Cada `CategorySection` usa `GAMES_PAGE_LIMIT=30` pero renderiza máximo 16 (`TWO_ROW_MAX_ITEMS`) → ~2× payload por sección, por N secciones. **Ojo:** el límite participa de la cache key del server y del warmup (`a:type:provider:limit`); si se cambia a 16 hay que warmear esa key también (`warmLobbySections`).

### P7. Búsqueda de juegos sin índice trigram
`search` hace `ILIKE '%term%'` → seq scan del catálogo completo en cada tecleo (debounce 350 ms ✓, pero sin mínimo de caracteres en el lobby). **Fix:** extensión `pg_trgm` + índice GIN sobre `games.name`, y exigir ≥2 caracteres antes de pedir.

### P8. Compression en Express ausente
El tráfico vía Vercel se comprime en el edge, pero cualquier consumo directo del dominio Railway va sin gzip. `app.use(compression())` cuesta una línea.

### P9. Panel admin duplicado dentro del sitio público
`web/app/admin/**` duplica `web-admin` → JS extra en el build del sitio de jugadores y doble mantenimiento (ya divergió una vez). Eliminarlo también figura en el informe de seguridad (M6).

## Medios / menores

- **P10.** Fuente `GeistMono` importada en el layout: si no se usa en UI visible, quitarla ahorra un request+~30 KB.
- **P11.** Sin `manifest.json`/PWA: para un casino móvil, "agregar a pantalla de inicio" + theme-color mejora retención; opcional service worker para shell offline.
- **P12.** `typescript.ignoreBuildErrors: true` en `next.config.mjs` (ambas apps): no es perf, pero deja pasar errores a producción; los `type-check` hoy pasan limpios — se puede quitar.
- **P13.** Chunks JS de web: 3.4 MB pre-gzip total del build; los mayores 370 KB + 224 KB. Razonable con code-splitting por ruta de Next ✓ (recharts/dnd-kit solo cargan en admin). Vigilar que nada de admin se importe desde componentes compartidos.
- **P14.** `useGames`/hooks sin cache cliente: volver de un juego al lobby re-fetchea todo. Un SWR/React Query con `staleTime` 60 s haría la navegación interna instantánea (P1 lo mitiga si el browser cachea).

## Plan sugerido (orden de ejecución)

1. **P1** Cache-Control en GETs públicos (1-2 h) — mayor impacto inmediato.
2. **P3** dedupe `/games/types` (15 min).
3. **P5** preconnect + fetchpriority (30 min).
4. **P4** resize en upload con sharp (medio día, requiere agregar sharp a la API).
5. **P6** límite 16 + warmup (1 h, tocar cache keys con cuidado).
6. **P2** endpoint `/lobby` agregado (medio día) → luego evaluar SSR/ISR.
7. **P7** pg_trgm (migración + 1 línea de validación).
8. **P8/P9/P10/P12** housekeeping.

---

## Addendum 2026-10-04 — `GET /api/games/top-played` y `top-providers` (dashboard admin)

**Síntoma:** el endpoint fallaba en producción (timeout). **Causa:** `getTopPlayed` / `getTopProviders` en `api/src/features/games/games.repository.ts` resolvían 4 subconsultas correlacionadas por cada fila de `games`, y todos los índices de `provider_transactions` empiezan por `provider_name`, así que cada juego del catálogo re-escaneaba la tabla completa (catálogo × transacciones).

Bench local con datos sintéticos (4000 juegos, 200k transacciones, 20k bets), `EXPLAIN ANALYZE`:

| Query | Antes | Reescrita (agregación en un solo paso) | Antes + índice |
|---|---|---|---|
| top-played | 80.4 s | 175 ms | 169 ms |
| top-providers | 932 ms | 245 ms | 1008 ms |

**Aplicado:** consultas reescritas como CTEs `GROUP BY` + `LEFT JOIN` al catálogo; migración `20261004000001-add-reporting-indexes` con `provider_transactions(provider_game_id, transaction_type)`, `provider_transactions(created_at)` y `games(provider_game_id)` (también sirven al informe de la casa y a game analytics, que joinean por `provider_game_id`); cota inferior sargable sobre `chip_movements.created_at` en el flujo semanal de fichas del dashboard. Test: `api/tests/repositories/games-top-played.repository.test.ts`.

**Regla:** reportes sobre `provider_transactions` se agregan una sola vez y se joinean; nunca subconsultas correlacionadas por fila del catálogo.
