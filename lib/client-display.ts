/**
 * Display-only normalization for client fields stored in ALL CAPS from the API.
 */

function isBlank(value: string | undefined | null): value is null | undefined | '' {
  return value == null || value.trim() === '';
}

/**
 * Title-style casing from uppercase source data (e.g. org names, contact persons).
 */
export function formatDisplayName(value: string | undefined | null): string {
  if (isBlank(value)) return '';
  return value
    .toLocaleLowerCase('en-ZA')
    .replace(/(^|[\s(/\-'"&])(\p{L})/gu, (_, boundary: string, letter: string) => boundary + letter.toUpperCase());
}

/**
 * Lowercase email for display (normalised local-part/domain).
 */
export function formatEmailDisplay(value: string | undefined | null): string {
  if (isBlank(value)) return '';
  return value.trim().toLowerCase();
}
