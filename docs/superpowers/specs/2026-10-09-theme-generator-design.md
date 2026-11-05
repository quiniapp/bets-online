# Generador de temas (theme-generator)

Estado: implementado en la rama feature/build-theme-generator (apilada sobre el PR del theme toggle).

## Problema

Hasta ahora la plataforma tenía temas fijos (light, dark, casino) definidos a mano en
styles/globals.css de cada frontend. Cambiar la identidad visual requería editar CSS y
desplegar. Se necesitaba una herramienta en el panel de administración para generar un
tema de forma sencilla y aplicarlo a web-admin y a web (jugadores) sin tocar código.

## Modelo de datos

- casino_settings.theme: light | dark | casino | custom. La columna ya existía; se amplió el enum.
- casino_settings.theme_config (JSONB, nullable, migración 20261009000001):

    {
      base: 'light' | 'dark',
      tokens: { [token]: color },
      backgroundGradient?: { angle, from, via?, to },
      gameCard?: { background?, border?, radius?, overlay? }
    }

  base decide sobre qué variables (claro u oscuro) se apoyan los overrides. tokens es un
  mapa parcial de sufijo de variable CSS a color. backgroundGradient es opcional y se aplica
  como linear-gradient sobre el fondo. gameCard es opcional y ajusta las cards de juegos del
  sitio de jugadores. El theme custom solo se aplica cuando theme === 'custom'; al volver a
  un preset se conserva la config guardada.

- casino_settings.saved_themes (JSONB, default [], migración 20261011000001): biblioteca de
  temas guardados, [{ id, name, config }]. Guardar un tema NO lo aplica.
- casino_settings.active_theme_id (VARCHAR(64), nullable, misma migración): id del tema
  guardado que está activo, o null si el activo es un preset.

Los tokens son los sufijos de las variables de globals.css (background, primary-foreground,
chart-1, sidebar-ring, ...). La lista canónica vive en helper (THEME_TOKEN_NAMES) para que
API, validador y frontends no se desincronicen.

## Generación de la paleta

helper/src/utils/theme.utils.ts expone generateThemeTokens(seeds). A partir de:
- mode (light | dark)
- primary (color de marca)
- background, accent, destructive, foreground (opcionales)

deriva todos los tokens: convierte a HSL, tintea las superficies neutras con el matiz de la
marca y elige el color de texto legible para primary/destructive con contraste WCAG. Es
determinista y no necesita dependencias externas.

## API

- PATCH /api/settings/casino acepta theme, themeConfig, savedThemes y activeThemeId
  (validador Zod: base, tokens con color CSS válido, backgroundGradient con angle 0-360 y
  colores válidos, gameCard con radius 0-64; savedThemes hasta 30 con id/nombre/config).
- Permisos en settings.domain: solo OWNER puede modificar la configuración del casino,
  incluidos theme y themeConfig. Ni ADMIN ni CASHIER.

## Aplicación en runtime

Un único sync por carga de página (AdminThemeSync en web-admin, CasinoThemeSync en web)
trae casino_settings y llama a applyPlatformTheme:
- theme === 'custom': aplica los tokens como variables inline en html (maxima precedencia,
  pisan :root y la clase light/dark) y fija la clase base con next-themes. Además setea
  --app-background-image (el gradiente, o none) y las variables --game-card-* (fondo, borde,
  radio y sombra inferior de las cards).
- cualquier preset: limpia las variables inline y deja que next-themes aplique la clase.

next-themes cambia la identidad de setTheme en cada cambio, por eso el efecto de sync tiene
deps vacías y guarda setTheme en un ref; si no, cada cambio re-dispararía el fetch y pisaría
la selección del usuario. El guard theme-sync evita que el sync pise un cambio en vuelo.

## Guardar vs aplicar

El generador y la aplicación están separados a propósito:

- El generador **solo guarda** temas en la biblioteca (crear/editar/eliminar). Nunca cambia
  el tema activo, así los presets se pueden volver a aplicar en cualquier momento.
- El **ThemeToggle** (barra superior) es el único punto de aplicación: lista los presets
  (light/dark/casino) y los temas guardados. Aplicar un preset setea theme=<preset> y
  activeThemeId=null; aplicar un tema guardado setea theme='custom', themeConfig=<config> y
  activeThemeId=<id>.

## UI

- Página /admin/settings/theme (guard OWNER): editor de temas con nombre, modo claro/oscuro,
  color de marca/fondo/acento/peligro, fondo con degradado (switch, desde/hasta/intermedio y
  ángulo), cards de juegos (fondo, borde, sombra, redondeo), vista previa en vivo y la lista
  de temas guardados con editar/eliminar. El botón dice Guardar tema / Guardar cambios.
- El ThemeToggle de la barra superior es el que aplica presets y temas guardados.
- Enlace Abrir generador de temas desde la tarjeta Theme de /admin/settings.

## Efecto de partículas

Ambos frontends montan un canvas fijo detrás del contenido (web/components/particle-background.tsx
y web-admin/components/particle-background.tsx, con -z-10). Dibuja un campo de partículas que
derivan lento y se conectan con líneas cuando están cerca, usando --primary para los puntos y
--foreground para las líneas del tema activo; un MutationObserver refresca los colores cuando
cambia el tema. Respeta prefers-reduced-motion (no dibuja), pausa cuando la pestaña está oculta
y ajusta la cantidad de partículas al tamaño de la ventana.

## Fuera de alcance

- Edición token por token (solo se editan los colores semilla; el resto se deriva).
- Tipografías o imágenes (el radio de las cards sí se puede ajustar).
- Tiempo real: el tema se aplica en cada carga; una pestaña ya abierta necesita recargar.
