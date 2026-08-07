import { parseISO, isValid } from 'date-fns';

const LEGACY_WALL_CLOCK_PATTERN = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/;
const HAS_TZ_OFFSET_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

const DEFAULT_ORG_TIMEZONE = 'Africa/Johannesburg';

/** Parse offset minutes for a UTC instant in an IANA timezone (e.g. SAST = +120). */
function getTimezoneOffsetMinutes(utcDate: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  });
  const parts = dtf.formatToParts(utcDate);
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes);
}

/** Parse org wall-clock string without date-fns-tz (legacy API responses). */
function parseLegacyWallClockInZone(value: string, timeZone: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  // Treat wall clock as UTC, then subtract org offset to get true UTC instant.
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 2; i += 1) {
    const offsetMin = getTimezoneOffsetMinutes(new Date(utcMs), timeZone);
    utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - offsetMin * 60_000;
  }

  const parsed = new Date(utcMs);
  return isValid(parsed) ? parsed : null;
}

/**
 * Parse an attendance timestamp for elapsed-time math.
 * Prefers UTC ISO instants; legacy org wall-clock strings require orgTimezone.
 */
export function parseAttendanceInstant(
  value: string | Date | null | undefined,
  orgTimezone?: string | null,
): Date | null {
  if (value == null || value === '' || value === 'null') return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (HAS_TZ_OFFSET_PATTERN.test(trimmed)) {
    const parsed = parseISO(trimmed);
    return isValid(parsed) ? parsed : null;
  }

  if (LEGACY_WALL_CLOCK_PATTERN.test(trimmed)) {
    const zone = orgTimezone?.trim() || DEFAULT_ORG_TIMEZONE;
    return parseLegacyWallClockInZone(trimmed, zone);
  }

  const fallback = new Date(trimmed);
  return isValid(fallback) ? fallback : null;
}

/** True when parsed server instant is valid and not far in the future (clock skew). */
export function isUsableShiftStartInstant(
  serverInstant: Date | null,
  skewMs = 60_000,
): boolean {
  if (!serverInstant) return false;
  return serverInstant.getTime() <= Date.now() + skewMs;
}
