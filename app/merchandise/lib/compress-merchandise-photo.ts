/** Matches POST /docs/upload MaxFileSizeValidator (size must be strictly under 5 MB). */
export const MERCHANDISE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const MERCHANDISE_PHOTO_TOO_LARGE = 'Photo must be under 5 MB';

const IMAGE_EXTENSION = /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i;

export const MERCHANDISE_PHOTO_STEPS: ReadonlyArray<{ maxEdge: number; quality: number }> = [
  { maxEdge: 1920, quality: 0.82 },
  { maxEdge: 1920, quality: 0.66 },
  { maxEdge: 1600, quality: 0.55 },
  { maxEdge: 1280, quality: 0.45 },
  { maxEdge: 1024, quality: 0.35 },
  { maxEdge: 800, quality: 0.3 },
];

type EncodeMerchandisePhoto = (source: File, maxEdge: number, quality: number) => Promise<Blob>;

/**
 * Whether the file is a photo the merchandise form can shrink before upload.
 */
export function isMerchandisePhotoFile(file: File): boolean {
  if (file.type.toLowerCase().startsWith('image/')) return true;
  return IMAGE_EXTENSION.test(file.name);
}

/**
 * Replaces the Nest 5 MB validator text with a message the form can show.
 */
export function merchandisePhotoUploadMessage(message: string, fallback: string): string {
  if (/expected size is less than|5242880|file too large|max 5\s?mb/i.test(message)) {
    return MERCHANDISE_PHOTO_TOO_LARGE;
  }
  const trimmed = message.trim();
  return trimmed || fallback;
}

function jpegFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim() || 'merchandise';
  return `${base}.jpg`;
}

function fittedSize(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(width, height, 1);
  const scale = Math.min(1, maxEdge / longest);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(MERCHANDISE_PHOTO_TOO_LARGE));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(MERCHANDISE_PHOTO_TOO_LARGE));
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Draws the photo to a JPEG canvas at the requested longest edge and quality.
 */
export async function encodeMerchandisePhoto(source: File, maxEdge: number, quality: number): Promise<Blob> {
  const image = await loadImage(source);
  const size = fittedSize(image.naturalWidth || image.width, image.naturalHeight || image.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error(MERCHANDISE_PHOTO_TOO_LARGE);
  context.drawImage(image, 0, 0, size.width, size.height);
  return canvasBlob(canvas, quality);
}

/**
 * Returns a photo small enough for POST /docs/upload.
 * Files already under 5 MB, and non-images, are returned unchanged.
 * @throws Error when an oversized photo cannot be shrunk under the limit
 */
export async function compressMerchandisePhoto(
  file: File,
  options?: { maxBytes?: number; encode?: EncodeMerchandisePhoto },
): Promise<File> {
  const maxBytes = options?.maxBytes ?? MERCHANDISE_PHOTO_MAX_BYTES;
  if (!isMerchandisePhotoFile(file) || file.size < maxBytes) return file;

  const encode = options?.encode ?? encodeMerchandisePhoto;
  let lastError: unknown;
  for (const step of MERCHANDISE_PHOTO_STEPS) {
    try {
      const blob = await encode(file, step.maxEdge, step.quality);
      if (blob.size < maxBytes) {
        return new File([blob], jpegFileName(file.name), {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error && lastError.message === MERCHANDISE_PHOTO_TOO_LARGE) {
    throw lastError;
  }
  throw new Error(MERCHANDISE_PHOTO_TOO_LARGE);
}
