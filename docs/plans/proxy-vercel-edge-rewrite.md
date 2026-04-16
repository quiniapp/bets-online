# Migrar proxy de Next.js rewrites a vercel.json (Edge)

## Problema actual

El rewrite `/api/:path*` está en `next.config.mjs` como una Vercel Function serverless:

```js
// web/next.config.mjs
async rewrites() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
}
```

**Consecuencias:**
- Cada request de API invoca una Vercel Function → cuenta contra el límite de invocaciones del plan
- La función corre en una región fija, no en el edge node más cercano al usuario
- Cold start posible si la función estuvo inactiva

## Solución: rewrite en vercel.json (Edge Network)

Los rewrites en `vercel.json` corren en el CDN edge de Vercel:
- No consumen invocaciones de funciones (gratuito en todos los planes)
- Se ejecutan en el nodo más cercano al usuario geográficamente
- Sin cold starts

```json
// vercel.json (en web/ o en raíz del workspace de Vercel)
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api-develop-9201.up.railway.app/api/:path*"
    }
  ]
}
```

Y en `next.config.mjs` eliminar el bloque `rewrites()`.

## Consideraciones por environment

El rewrite en `vercel.json` no puede leer variables de entorno en runtime.
La URL del backend debe estar hardcodeada o manejada por environment.

**Opción A — Un vercel.json por environment:**
Usar Preview Deployments de Vercel con `vercel.json` diferente por branch.

**Opción B — Variable en build time:**
Vercel permite variables de entorno en `vercel.json` con la sintaxis `@variable`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "@API_URL/api/:path*"
    }
  ]
}
```
Donde `API_URL` es una variable configurada en el dashboard de Vercel por environment (Production / Preview / Development).

**Opción C — Dominio propio (solución definitiva):**
Si ambos servicios están bajo `*.dominio.com`, las cookies son same-site y el proxy no es necesario.
- `app.dominio.com` → Vercel
- `api.dominio.com` → Railway

## Archivos a modificar

- `web/next.config.mjs` → eliminar `rewrites()`
- `web/vercel.json` (o raíz) → agregar rewrite con URL de Railway

## Referencias
- Vercel Edge Rewrites: https://vercel.com/docs/edge-network/rewrites
- Vercel environment variables en vercel.json: https://vercel.com/docs/projects/environment-variables
