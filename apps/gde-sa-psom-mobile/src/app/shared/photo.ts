/**
 * Photos for the suggest-a-place forms. The API stores them as base64 data
 * URLs and the portal only accepts files up to 1 MB, so photos are redrawn on
 * a canvas and re-encoded as JPEG until they fit.
 */

/** Stay a little under the portal's 1 MB so both clients behave the same. */
export const MAX_PHOTO_BYTES = 950 * 1024;

/** Decoded size of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode the photo'));
    img.src = src;
  });
}

function encode(img: HTMLImageElement, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * A JPEG data URL of `src` (a webPath or data URL) no bigger than `maxBytes`,
 * shrinking the longest side and quality step by step.
 */
export async function toUploadablePhoto(src: string, maxBytes = MAX_PHOTO_BYTES): Promise<string> {
  const img = await loadImage(src);
  let side = 1280;
  let quality = 0.8;
  for (let attempt = 0; attempt < 6; attempt++) {
    const dataUrl = encode(img, side, quality);
    if (dataUrlBytes(dataUrl) <= maxBytes) return dataUrl;
    side = Math.round(side * 0.8);
    quality = Math.max(0.5, quality - 0.1);
  }
  throw new Error('Photo is too large');
}
