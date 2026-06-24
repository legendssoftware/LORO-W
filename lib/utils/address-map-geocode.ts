import type { ClientAddress } from '@/api/types/clients';

export const NOMINATIM_DELAY_MS = 1100;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Single-line postal address for forward geocoding. */
export function formatAddressLine(address?: ClientAddress | null): string | null {
  if (!address) return null;
  const parts = [
    address.street,
    address.suburb,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter((p) => (p ?? '').toString().trim() !== '');
  return parts.length ? parts.join(', ') : null;
}

export function hasStoredCoordinates(
  latitude?: number | string | null,
  longitude?: number | string | null
): boolean {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/**
 * Forward geocode via OpenStreetMap Nominatim (respect ~1 req/s usage policy).
 */
export async function geocodeAddressLine(
  query: string,
  userAgentLabel = 'LORO-Reports/1.0 (map)'
): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': userAgentLabel,
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat ?? '');
  const lng = parseFloat(data[0].lon ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}
