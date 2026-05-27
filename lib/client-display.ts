/**
 * Display-only normalization for client fields stored in ALL CAPS from the API.
 */

function isBlank(value: string | undefined | null): value is null | undefined | '' {
  return value == null || value.trim() === '';
}

const LEGAL_SUFFIX_PATTERN =
  /\s*\((?:pty|ltd|cc|inc|corp)(?:\.?|\s+ltd)?\)\s*|\b(?:pty|ltd|cc|limited|inc|corp)\b\.?/gi;

/**
 * Two-letter (or fewer) initials for org-site map popups and avatars.
 * Strips ERP bracket codes and legal suffixes before taking word initials.
 */
export function orgSiteInitials(rawName: string, max = 2): string {
  const withoutCode = String(rawName)
    .trim()
    .replace(/^\[[^\]]+\]\s*/i, '')
    .replace(LEGAL_SUFFIX_PATTERN, ' ')
    .trim();

  const letters = withoutCode
    .split(/\s+/)
    .filter((w) => w.length > 0 && /\p{L}/u.test(w[0] ?? ''))
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, max);

  return letters || '?';
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
