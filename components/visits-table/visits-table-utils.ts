/**
 * Shared URL, address, and duration helpers for the visits table and detail dialog.
 */

/** True if string looks like "lat,lng" coordinates. */
export function isCoordLike(s: string): boolean {
  const t = s.trim();
  return /^-?\d{1,3}\.?\d*\s*,\s*-?\d{1,3}\.?\d*$/.test(t);
}

/** Google Maps URL for coordinates or address search. */
export function buildMapsUrl(location: string): string {
  const t = location.trim();
  if (!t || t === '-') return '#';
  if (isCoordLike(t)) return `https://www.google.com/maps?q=${encodeURIComponent(t)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t)}`;
}

/** tel: URL for phone numbers (strip spaces/dashes). */
export function buildTelUrl(phone: string): string {
  const normalized = phone.replace(/[\s\-()]/g, '');
  return `tel:${normalized}`;
}

/** tel: URL for phone numbers; returns '#' when missing. */
export function buildTelUrlSafe(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '#';
  const normalized = phone.replace(/[\s\-()]/g, '');
  return normalized ? `tel:${normalized}` : '#';
}

export const VISITS_TABLE_LINK_CLASS = 'text-primary underline hover:opacity-80';

type AddressLike = {
  formattedAddress?: string;
  street?: string;
  streetNumber?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
} | null | undefined;

/** Format address for display; falls back to raw string when no address. */
export function formatAddressForDisplay(address?: AddressLike, fallback?: string): string {
  if (!address) return fallback ?? '-';
  if (address.formattedAddress) return address.formattedAddress;
  const parts = [
    address.streetNumber,
    address.street,
    address.suburb,
    address.city,
    address.state,
    address.country,
    address.postalCode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : fallback ?? '-';
}

/** Parse duration string "Xh Ym" to total minutes. */
export function parseDurationToMinutes(duration: string | null | undefined): number {
  if (!duration || typeof duration !== 'string') return 0;
  const hoursMatch = duration.match(/(\d+)h/);
  const minutesMatch = duration.match(/(\d+)m/);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  return hours * 60 + minutes;
}

/** Format minutes for display: always "Xh Ym" (e.g. "0h 9m"). */
export function formatDurationDisplay(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

/** Normalize duration string to display "Xh Ym"; returns '-' if missing. */
export function normalizeDurationDisplay(duration: string | null | undefined): string {
  if (duration == null || duration === '') return '-';
  const mins = parseDurationToMinutes(duration);
  return formatDurationDisplay(mins);
}

/** Currency code to symbol map for sales value display. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
  BWP: 'P',
  NAD: '$',
};

/** Format sales value with currency; falls back to ZAR when currency missing. */
export function formatSalesValue(
  value: number | null | undefined,
  currency?: string | null
): string {
  if (value == null) return '-';
  const sym = CURRENCY_SYMBOLS[currency ?? 'ZAR'] ?? currency ?? 'R';
  return `${sym} ${Number(value).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Contact made: Yes/No from boolean or YES/NO/yes/no string. */
export function formatContactMade(value: boolean | string | null | undefined): string {
  if (value === true || value === 'YES' || value === 'yes') return 'Yes';
  if (value === false || value === 'NO' || value === 'no') return 'No';
  return '-';
}

export type VisitsColumnWidth = 'default' | 'quarter' | 'double';

export function visitsColumnWidthClass(width: VisitsColumnWidth | undefined): string {
  switch (width) {
    case 'quarter':
      return 'min-w-[7rem]';
    case 'double':
      return 'min-w-[24rem]';
    default:
      return 'min-w-[12rem]';
  }
}
