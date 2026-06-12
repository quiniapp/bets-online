import sharp from 'sharp';

export interface UploadImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

/** Max widths per asset kind — mobile shows banners at ~160px tall and game
 *  logos in small cards, so the original (up to 5MB) is pure wasted data. */
export const IMAGE_PRESETS = {
  banner: { maxWidth: 1600, quality: 80 },
  logo: { maxWidth: 512, quality: 80 }
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

/**
 * Downscale + convert an uploaded image to WebP before storing it.
 * - Never enlarges smaller images.
 * - SVGs pass through untouched (already tiny and resolution-independent).
 * - Animated GIF/WebP keep their animation.
 */
export async function processImageUpload(file: UploadImage, preset: ImagePreset): Promise<UploadImage> {
  if (file.mimetype === 'image/svg+xml') return file;

  const { maxWidth, quality } = IMAGE_PRESETS[preset];
  const animated = file.mimetype === 'image/gif' || file.mimetype === 'image/webp';
  const buffer = await sharp(file.buffer, { animated })
    .rotate() // honor EXIF orientation before it's stripped
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

  return {
    buffer,
    mimetype: 'image/webp',
    originalname: file.originalname.replace(/\.[^.]*$/, '') + '.webp'
  };
}
