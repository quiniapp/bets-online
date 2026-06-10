import path from 'path';
import crypto from 'crypto';

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.avif'
]);

/**
 * Builds a storage object file name from server-controlled values only.
 * The client-supplied original name is never embedded in the key (path
 * traversal / key injection); only its extension survives, and only if
 * it is an allowlisted image extension.
 */
export function safeImageFileName(originalname: string): string {
  const ext = path.extname(originalname).toLowerCase();
  const safeExt = ALLOWED_IMAGE_EXTENSIONS.has(ext) ? ext : '';
  return `${Date.now()}-${crypto.randomUUID()}${safeExt}`;
}

/**
 * Sanitizes a value used as a folder segment of a storage key
 * (e.g. provider name). Keeps it readable, removes path separators
 * and dot segments.
 */
export function safeKeySegment(value: string): string {
  const cleaned = value.replace(/[^\w.-]/g, '_').replace(/\.{2,}/g, '_');
  return cleaned || '_';
}
