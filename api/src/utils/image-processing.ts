import sharp from 'sharp';
import { ErrorCode } from 'helper';
import { AppError } from '../middleware/error.middleware';

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
 * - Animated GIF/WebP keep their animation.
 * - Doubles as content validation: the multer filter only checks the
 *   client-declared mimetype; here sharp must actually decode the bytes,
 *   so a renamed non-image is rejected with a 400.
 */
export async function processImageUpload(file: UploadImage, preset: ImagePreset): Promise<UploadImage> {
  const { maxWidth, quality } = IMAGE_PRESETS[preset];
  const animated = file.mimetype === 'image/gif' || file.mimetype === 'image/webp';
  let buffer: Buffer;
  try {
    buffer = await sharp(file.buffer, { animated })
      .rotate() // honor EXIF orientation before it's stripped
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  } catch {
    throw new AppError(400, ErrorCode.INVALID_INPUT, 'File is not a valid image');
  }

  return {
    buffer,
    mimetype: 'image/webp',
    originalname: file.originalname.replace(/\.[^.]*$/, '') + '.webp'
  };
}
