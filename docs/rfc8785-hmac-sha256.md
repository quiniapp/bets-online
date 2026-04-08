# RFC 8785 + HMAC-SHA256: Guía práctica

## ¿Para qué sirven juntos?

Cuando dos servidores se comunican por HTTP, necesitan una forma de verificar que:
1. El mensaje no fue **alterado** en tránsito
2. El mensaje proviene de quien **dice ser**

RFC 8785 + HMAC-SHA256 resuelven esto juntos: primero normalizamos el JSON para que siempre tenga la misma forma, luego lo firmamos con una clave secreta compartida.

---

## Parte 1: RFC 8785 — JSON Canonicalization Scheme (JCS)

### El problema que resuelve

El mismo objeto JSON puede serializarse de muchas formas:

```json
{ "b": 2, "a": 1 }
{ "a": 1, "b": 2 }
{"a":1,"b":2}
{ "a": 1, "b": 2 }
```

Todos son equivalentes semánticamente, pero producen strings distintos. Si firmás uno y el receptor serializa diferente, la firma no coincide aunque el contenido sea idéntico.

### La solución: canonicalización

RFC 8785 define una forma **única y determinista** de serializar JSON:

**Reglas:**
1. Las **keys** se ordenan alfabéticamente (Unicode code point order)
2. Sin espacios ni saltos de línea extra (minificado)
3. Los strings usan escape Unicode para caracteres especiales
4. Los números siguen el formato IEEE 754 (sin ceros innecesarios)
5. Se aplica **recursivamente** a objetos anidados

### Ejemplo

**Input (cualquier orden):**
```json
{
  "timestamp": 1734904927,
  "playerId": "1",
  "currency": "EUR",
  "balance": "504.44",
  "providerName": "pragmatic"
}
```

**Output canónico (keys ordenadas alfabéticamente):**
```json
{"balance":"504.44","currency":"EUR","playerId":"1","providerName":"pragmatic","timestamp":1734904927}
```

### Implementación en TypeScript/Node.js

```typescript
// Opción 1: implementación manual (suficiente para la mayoría de casos)
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map(item => canonicalize(item));
    return `[${items.join(',')}]`;
  }

  // Objeto: ordenar keys alfabéticamente
  const sortedKeys = Object.keys(value as object).sort();
  const pairs = sortedKeys.map(key => {
    const val = canonicalize((value as Record<string, unknown>)[key]);
    return `${JSON.stringify(key)}:${val}`;
  });

  return `{${pairs.join(',')}}`;
}

// Uso:
const body = { timestamp: 1234, playerId: "1", currency: "EUR" };
const canonical = canonicalize(body);
// → '{"currency":"EUR","playerId":"1","timestamp":1234}'
```

```typescript
// Opción 2: librería (más robusta para edge cases)
// pnpm add canonicalize
import canonicalize from 'canonicalize';

const canonical = canonicalize(body);
```

---

## Parte 2: HMAC-SHA256

### ¿Qué es HMAC?

**Hash-based Message Authentication Code** — es una firma criptográfica que combina:
- Un **mensaje** (en nuestro caso, el JSON canonicalizado)
- Una **clave secreta** compartida entre las dos partes
- Una **función hash** (SHA-256)

### ¿Por qué no solo SHA-256?

SHA-256 solo verifica integridad (que el mensaje no cambió), pero cualquiera puede calcular el hash. HMAC agrega la clave secreta, por lo que solo quien conoce el secret puede generar o verificar la firma.

### Cómo funciona internamente

```
HMAC(key, message) = SHA256(
  (key XOR opad) || SHA256((key XOR ipad) || message)
)
```

No necesitás entender la fórmula para usarlo. Lo importante: **sin el secret, no podés falsificar la firma**.

### Implementación en Node.js

```typescript
import crypto from 'crypto';

function generateHmacSignature(secret: string, canonicalBody: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(canonicalBody, 'utf8')
    .digest('hex');
}

// Uso:
const secret = 'appsecret';
const body = { playerId: "1", currency: "EUR", timestamp: 1734904927 };
const canonical = canonicalize(body);
const signature = generateHmacSignature(secret, canonical);

// El header que se envía:
// Authorization: HMAC-SHA256 app-id-1:<signature>
```

### Verificación (lado receptor)

```typescript
function verifyHmacSignature(
  secret: string,
  canonicalBody: string,
  receivedSignature: string
): boolean {
  const expected = generateHmacSignature(secret, canonicalBody);

  // IMPORTANTE: usar timingSafeEqual para evitar timing attacks
  // Un atacante podría medir el tiempo de comparación carácter a carácter
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}
```

> **¿Por qué `timingSafeEqual`?**
> Una comparación normal (`===`) puede tardar distinto tiempo según cuántos caracteres coinciden al inicio. Un atacante sofisticado puede medir esos microsegundos para adivinar la firma gradualmente. `timingSafeEqual` siempre tarda el mismo tiempo independientemente del resultado.

---

## Parte 3: El flujo completo (sender + receiver)

### Lado que ENVÍA (Operator → Provider)

```typescript
async function callProvider(endpoint: string, body: object) {
  const canonical = canonicalize(body);
  const signature = generateHmacSignature(process.env.SECRET_KEY, canonical);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `HMAC-SHA256 ${process.env.USERNAME}:${signature}`
    },
    body: canonical  // enviamos el JSON canonicalizado
  });

  return response.json();
}
```

### Lado que RECIBE (Provider → Operator / nuestros endpoints)

```typescript
function hmacMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Leer el header
  const authHeader = req.headers['authorization'];
  // formato: "HMAC-SHA256 username:hexSignature"

  if (!authHeader?.startsWith('HMAC-SHA256 ')) {
    return res.status(401).json({ viralErrorCode: 'AuthenticationFailure', message: 'Missing auth header' });
  }

  const [, credentials] = authHeader.split(' ');
  const [username, receivedSignature] = credentials.split(':');

  // 2. Verificar username
  if (username !== process.env.USERNAME) {
    return res.status(401).json({ viralErrorCode: 'AuthenticationFailure', message: 'Invalid username' });
  }

  // 3. Canonicalizar el body recibido
  const canonical = canonicalize(req.body);

  // 4. Verificar la firma
  const isValid = verifyHmacSignature(process.env.SECRET_KEY, canonical, receivedSignature);

  if (!isValid) {
    return res.status(401).json({ viralErrorCode: 'AuthenticationFailure', message: 'Invalid signature' });
  }

  next();
}
```

---

## Parte 4: Ejemplo completo verificable

Tomado directamente del documento 21Viral v1.20:

**Input:**
```json
{
  "playerId": "1",
  "currency": "EUR",
  "providerName": "pragmatic",
  "providerGameId": "vs20olympgate",
  "gameMode": "Real",
  "timestamp": 1734904927,
  "language": "en",
  "playerDeviceType": "Desktop",
  "balance": "504.44",
  "playerUserName": "player1"
}
```

**Forma canónica (keys ordenadas):**
```
{"balance":"504.44","currency":"EUR","gameMode":"Real","language":"en","playerDeviceType":"Desktop","playerId":"1","playerUserName":"player1","providerGameId":"vs20olympgate","providerName":"pragmatic","timestamp":1734904927}
```

**Secret:** `appsecret`
**Username:** `app-id-1`

**Header resultante:**
```
Authorization: HMAC-SHA256 app-id-1:1e06d2f27b2deee94aae1b09230a1027afc58da7aeae9311bc8ceb2d8e21bf5b
```

Podés verificarlo en Node.js:
```typescript
const crypto = require('crypto');

const canonical = '{"balance":"504.44","currency":"EUR","gameMode":"Real","language":"en","playerDeviceType":"Desktop","playerId":"1","playerUserName":"player1","providerGameId":"vs20olympgate","providerName":"pragmatic","timestamp":1734904927}';

const signature = crypto
  .createHmac('sha256', 'appsecret')
  .update(canonical, 'utf8')
  .digest('hex');

console.log(signature);
// → 1e06d2f27b2deee94aae1b09230a1027afc58da7aeae9311bc8ceb2d8e21bf5b ✓
```

---

## Parte 5: Gotchas comunes

| Error | Causa | Solución |
|-------|-------|----------|
| Firma no coincide | Body llegó parseado por Express y re-serializado diferente | Canonicalizar `req.body` (el objeto ya parseado), no el raw string |
| Signature length mismatch en `timingSafeEqual` | El received signature tiene longitud distinta | Validar longitud antes, o manejar el error que lanza timingSafeEqual |
| Keys con caracteres Unicode | El orden de RFC 8785 usa Unicode code points, no orden lexicográfico simple | Usar `localeCompare` no, usar `.sort()` nativo de JS que ya es por code point |
| Números con decimales | `1.0` vs `1` — RFC 8785 normaliza números | Usar la librería `canonicalize` para edge cases numéricos |

---

## Resumen en una línea

> **Canonicalizar el JSON (RFC 8785) + firmar con HMAC-SHA256 + clave secreta compartida = autenticación y verificación de integridad sin certificados ni OAuth.**
