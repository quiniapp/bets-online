export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', err => reject(err));
    img.src = src;
  });
}

/**
 * Recorta la región `croppedAreaPixels` de la imagen `src` y devuelve un Blob.
 * La salida queda exactamente cuadrada (la card del juego es aspect-square),
 * limitada a `maxSize` px de lado para no subir un crop gigante. El backend
 * igual la reprocesa a WebP 512px, pero acotar acá ahorra ancho de banda.
 */
export async function getCroppedBlob(
  src: string,
  croppedAreaPixels: CropArea,
  maxSize = 1024
): Promise<Blob> {
  const image = await loadImage(src);
  const side = Math.min(maxSize, Math.round(croppedAreaPixels.width));

  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    side,
    side
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))),
      'image/webp',
      0.9
    );
  });
}
