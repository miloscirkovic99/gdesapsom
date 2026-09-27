/**
 * Browser-side image preparation for the catalog admin.
 *
 * The API stores images as base64 and has no image library, so the full image
 * and its thumbnail are both produced here with a canvas before upload
 * (see apps/api/v2/dog-food/images.POST.js: `thumbnailBase64` is required).
 */

export const IMAGE_MAX_SIDE = 1200;
export const THUMBNAIL_MAX_SIDE = 320;
export const LOGO_MAX_SIDE = 256;

/** Raw upload limit before resizing; the stored image is far smaller. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export interface PreparedImage {
  /** Full-size image, JPEG data URI, longest side <= IMAGE_MAX_SIDE. */
  image: string;
  /** Thumbnail, JPEG data URI, longest side <= THUMBNAIL_MAX_SIDE. */
  thumbnail: string;
}

export function isImageFile(file: File): boolean {
  return /^image\//.test(file.type);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = dataUrl;
  });
}

/**
 * Scales a data URI so its longest side is at most `maxSide` and re-encodes it.
 * PNG keeps transparency (logos); JPEG is used for photos.
 */
export async function resizeDataUrl(
  dataUrl: string,
  maxSide: number,
  type: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.85,
): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  if (type === 'image/jpeg') {
    // JPEG has no alpha; paint white so transparent PNG sources do not turn black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL(type, quality);
}

/** Full image + thumbnail for a product photo. */
export async function prepareProductImage(file: File): Promise<PreparedImage> {
  const source = await readFileAsDataUrl(file);
  const [image, thumbnail] = await Promise.all([
    resizeDataUrl(source, IMAGE_MAX_SIDE, 'image/jpeg', 0.85),
    resizeDataUrl(source, THUMBNAIL_MAX_SIDE, 'image/jpeg', 0.8),
  ]);
  return { image, thumbnail };
}

/** Small PNG for a shop logo (keeps transparency). */
export async function prepareLogo(file: File): Promise<string> {
  const source = await readFileAsDataUrl(file);
  return resizeDataUrl(source, LOGO_MAX_SIDE, 'image/png');
}
