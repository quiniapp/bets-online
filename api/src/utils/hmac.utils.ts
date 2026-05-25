import crypto from 'crypto';

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${(value as unknown[]).map(canonicalize).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const sorted = Object.keys(obj).sort();
  return `{${sorted.map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

export function buildHmacAuthHeader(
  username: string,
  secretKey: string,
  body: Record<string, unknown>
): string {
  const canonical = canonicalize(body);
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(canonical, 'utf8')
    .digest('hex');
  return `HMAC-SHA256 ${username}:${signature}`;
}
