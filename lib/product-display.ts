/** Default product thumbnail when API omits `imageUrl` or load fails (aligned with server ERP import default). */
export const DEFAULT_PRODUCT_IMAGE_URL =
  'https://cdn-icons-png.flaticon.com/128/12815/12815146.png';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4400';
const MAX_PRODUCT_NAME_LENGTH = 30;

type ProductImageSource = { imageUrl?: string; image_url?: string };

/**
 * Returns a valid image URL for display. Resolves from imageUrl (arg), then product.imageUrl,
 * then product.image_url. Relative paths (e.g. /uploads/...) are turned into absolute URLs using API_URL.
 * Only http(s) or relative paths are used; otherwise returns DEFAULT_PRODUCT_IMAGE_URL.
 */
export function getProductImageUri(
  imageUrl: string | undefined,
  product?: ProductImageSource
): string {
  const raw =
    typeof imageUrl === 'string' && imageUrl.trim()
      ? imageUrl.trim()
      : typeof product?.imageUrl === 'string' && product.imageUrl.trim()
        ? product.imageUrl.trim()
        : typeof product?.image_url === 'string' && product.image_url.trim()
          ? product.image_url.trim()
          : '';
  if (!raw) return DEFAULT_PRODUCT_IMAGE_URL;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) {
    const base = API_URL.replace(/\/$/, '');
    return `${base}${raw}`;
  }
  return DEFAULT_PRODUCT_IMAGE_URL;
}

/**
 * Returns product name trimmed to 30 characters, with fallback when missing.
 */
export function getProductDisplayName(name: string | undefined): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  const sliced = trimmed.slice(0, MAX_PRODUCT_NAME_LENGTH);
  return sliced || 'Product';
}
