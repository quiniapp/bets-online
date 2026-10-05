# Spec: Banners estáticos en home

**Fecha:** 2026-06-08
**Rama:** `feat/static-banners`

## Objetivo

Los banners pasan de estar atados a un juego a ser **imágenes promocionales estáticas**. Se suben desde celular o PC en `/admin/banners`, se almacenan en Supabase Storage y se muestran en un **carrusel rotativo** en la home (`/`), como en otras plataformas de casino.

Hoy el sistema es game-céntrico: para crear un banner hay que elegir un juego, y el banner linkea al play de ese juego. Se desacopla por completo en ambas direcciones (banner no conoce juego, juego no conoce banner).

## Fuera de alcance (YAGNI)

- Links/click-through en los banners (son decorativos).
- Renombrar tabla/tipos `game_banners`/`GameBanner` → la columna `game_id` queda nullable y vestigial; renombrar tocaría ~25 archivos sin beneficio funcional.
- Asociar juegos a banners.

## Almacenamiento de imágenes

Patrón URL-only (ya usado por el código actual):

1. Frontend manda el archivo vía `FormData`.
2. Multer lo recibe en memoria (buffer, máx 5MB, solo `image/*`).
3. `supabaseStorage.uploadFile('banner-images', path, buffer, mimetype)` sube a Supabase Storage. Ruta: `banners/{bannerId}/{timestamp}-{originalname}`.
4. Supabase devuelve la **URL pública** (CDN).
5. La DB (`game_banners.image_url`, TEXT) guarda **solo el string de URL**. Los bytes nunca tocan Postgres.

Lectura: `GET /banners` devuelve filas con `imageUrl`; el `<img src>` baja la imagen directo del CDN.

**Requisitos de entorno:** bucket `banner-images` existe y es público; `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` seteadas.

## Cambios por capa

### 1. Datos (DB + tipos)

- **Migración nueva**: `game_banners.game_id` → `allowNull: true` (hoy `NOT NULL`). La FK a `games` se mantiene pero nullable; filas nuevas la dejan en null.
- **Model** (`game-banner.model.ts`): `gameId` → `allowNull: true`, `declare gameId: string | null`.
- **Tipos helper** (`models.types.ts`):
  - `GameBanner.gameId?: string | null`
  - `GameBannerWithGame.game?: Game | null`
  - `CreateGameBannerDto` → `{ sortOrder?: number }` (sin `gameId` obligatorio).

### 2. Backend

- **`POST /admin/banners`** pasa a **multipart** (`upload.single('image')`):
  - Valida que venga archivo (400 si no).
  - Crea la fila (sin `gameId`, `sortOrder` = max+1 si no viene).
  - Sube la imagen a Supabase usando el `id` recién creado en la ruta.
  - Guarda `imageUrl` en la fila.
  - Devuelve el banner creado.
  - Si la subida falla, borra la fila creada (no dejar banner en blanco).
- **`POST /:id/image`** se mantiene para **reemplazar** la imagen de un banner existente.
- **`DELETE /:id`**: además de borrar la fila, borra el archivo de Storage (`supabaseStorage.deleteFile`) para no dejar huérfanos. Derivar el path de Storage desde el `imageUrl` guardado.
- **`findAllActive`** (repo, lectura pública): sacar el `include` del juego → query más liviana, devuelve `GameBanner[]` (id, imageUrl, sortOrder, isActive).
- **`mapWithGame`**: null-safe ante `game` nulo (por si queda alguna lectura que lo use).
- **Repo `create`**: aceptar sin `gameId`; calcular `sortOrder` = max+1 cuando no se pasa.

### 3. Admin (`web-admin/app/admin/banners/page.tsx` + `useGameBanners.ts`)

- Botón **"Agregar"** (que abre `AddGameDialog` con buscador de juegos) → **"Subir banner"**: dispara un `<input type="file" accept="image/*">` que abre cámara/galería en celular y explorador en PC. Al elegir, hace `POST` multipart y refresca.
- Eliminar `AddGameDialog`, el import de `useGames` y la lógica de `existingGameIds`.
- **`BannerRow`**: mostrar thumbnail de `imageUrl` + arrastrar para ordenar + switch activo + botón reemplazar imagen (el `BannerImageUpload` actual) + borrar. Quitar nombre/proveedor del juego.
- **`useGameBanners.create`**: cambiar firma para mandar `FormData` (archivo) en vez de JSON con `gameId`.
- Estados de loading: el botón "Subir banner" muestra spinner mientras sube (patrón CLAUDE.md). El reemplazo de imagen ya lo tiene.
- Manejo de error: hoy el upload falla en silencio (solo actúa si `json.success`). Agregar `toast` de error en fallo.

### 4. Home (`web/feature/hero/index.tsx`)

- Reusar `web/components/ui/carousel.tsx` (shadcn/embla): 1 imagen grande a la vez, rota sola (~5s, autoplay), deslizable, ordenadas por `sortOrder`.
- Quitar `handleBannerClick` y la navegación al play del juego — imágenes decorativas.
- Usar `GameBanner` (solo `imageUrl`) en vez de `GameBannerWithGame`.
- Empty state: si no hay banners activos, no renderiza nada (como hoy).

## Edge cases

- Banner sin imagen: no debería existir (el create exige archivo). Si por dato viejo hay uno sin `imageUrl`, el carrusel lo saltea.
- Carrusel con 1 sola imagen: no rota, sin flechas.
- Autoplay se pausa al interactuar (swipe/hover).
- Borrado: si el archivo ya no está en Storage, el `deleteFile` no debe romper el borrado de la fila (error de Storage no bloquea).

## Testing

- **API**: `POST /admin/banners` sin archivo → 400. Con archivo → crea fila + imageUrl. `DELETE` → borra fila e invoca `deleteFile`. `GET /banners` → devuelve activos sin juego.
- **Admin**: mock del upload; subir muestra loading, refresca lista, error muestra toast.
- **Home**: render del carrusel con N imágenes; ordena por sortOrder; sin banners → no renderiza.
