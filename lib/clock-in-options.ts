import type { ClockInOptionKey } from '@/api/types/attendance';

/** Labels sent as checkInNotes (aligned with server / mobile). */
export const CLOCK_IN_OPTION_LABELS = [
  'At office',
  'Working From Home',
  'Starting From Home',
  'Offsite',
  'Driving',
] as const;

export type ClockInOptionLabel = (typeof CLOCK_IN_OPTION_LABELS)[number];

export const OPTION_KEY_TO_LABEL: Record<ClockInOptionKey, ClockInOptionLabel> = {
  at_office: 'At office',
  work_from_home: 'Working From Home',
  starting_from_home: 'Starting From Home',
  offsite: 'Offsite',
  driving: 'Driving',
};

/**
 * i18n keys (`screens` namespace) for clock-in UI copy. API note payloads keep the English
 * labels above; translate with these keys only where text is rendered.
 */
export const CLOCK_IN_OPTION_DISPLAY_KEYS: Record<ClockInOptionKey, string> = {
  at_office: 'dashboard.clockIn.atOffice',
  work_from_home: 'dashboard.clockIn.workFromHome',
  starting_from_home: 'dashboard.clockIn.startingFromHome',
  offsite: 'dashboard.clockIn.offsite',
  driving: 'dashboard.clockIn.driving',
};

/** When API omits outsideBranchRadiusMessage (older server). */
export const OUTSIDE_BRANCH_RADIUS_MESSAGE_FALLBACK_KEY = 'dashboard.attendance.outsideBranchRadius';

/** Error code returned by POST /att/in when a restricted user picks a remote clock-in mode. */
export const OFFSITE_NOT_ALLOWED_CODE = 'OFFSITE_NOT_ALLOWED';

/** Fallback copy (i18n key) when the server omits the message for an offsite-blocked user. */
export const OFFSITE_NOT_ALLOWED_MESSAGE_KEY = 'dashboard.attendance.offsiteNotAllowed';

/** Shown when location context could not be loaded (generic fallback). */
export const LOCATION_CONTEXT_UNAVAILABLE_MESSAGE_KEY = 'dashboard.locationContext.missingContext';

export type LocationContextFailureReason =
  | 'permission_denied'
  | 'position_unavailable'
  | 'api_unreachable'
  | 'api_error'
  | 'missing_context';

/** i18n key (`screens` namespace) for user-facing copy when clock-in context could not be loaded. */
export function locationContextFailureMessageKey(reason: LocationContextFailureReason): string {
  switch (reason) {
    case 'permission_denied':
      return 'dashboard.locationContext.permissionDenied';
    case 'position_unavailable':
      return 'dashboard.locationContext.positionUnavailable';
    case 'api_unreachable':
      return 'dashboard.locationContext.apiUnreachable';
    case 'api_error':
      return 'dashboard.locationContext.apiError';
    case 'missing_context':
      return LOCATION_CONTEXT_UNAVAILABLE_MESSAGE_KEY;
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

/** Remote options when server context is unavailable (never default to at-office). */
export const FALLBACK_REMOTE_CLOCK_IN_OPTION_KEYS: ClockInOptionKey[] = [
  'starting_from_home',
  'work_from_home',
  'offsite',
  'driving',
];

export function isLocationContextUnavailable(
  ctx: { availableClockInOptions?: ClockInOptionKey[] } | null | undefined,
  loading: boolean,
): boolean {
  return !loading && ctx == null;
}

/** Mirrors server `canClockInOffsite`; the server remains the source of truth. */
const OFFSITE_ACCESS_LEVELS: ReadonlySet<string> = new Set([
  'owner',
  'admin',
  'manager',
  'executive',
  'developer',
  'support',
  'hr',
]);
const OFFSITE_WORKFORCE_TYPES: ReadonlySet<string> = new Set([
  'driver',
  'field_employee',
  'external_sales',
  'security',
]);

export function canClockInOffsite(
  user: { accessLevel?: string | null; workforceType?: string | null } | null | undefined,
): boolean {
  if (!user) return false;
  const level = user.accessLevel?.toLowerCase().trim() ?? '';
  const workforce = user.workforceType?.toLowerCase().trim() ?? '';
  return OFFSITE_ACCESS_LEVELS.has(level) || OFFSITE_WORKFORCE_TYPES.has(workforce);
}

/**
 * True for desktop-class browsers (including laptops, which a user agent cannot tell apart).
 * Phones and tablets are false. Only a UI hint for the no-GPS fallback; the server decides.
 */
export function isDesktopBrowser(userAgent: string | null | undefined): boolean {
  const ua = userAgent?.toLowerCase() ?? '';
  if (!ua) return false;
  return !/(android|iphone|ipad|ipod|mobile|tablet|kindle|silk|windows phone|blackberry)/.test(ua);
}

/** User is outside the office radius and not allowed to work remotely: hide buttons, show message. */
export function isOffsiteBlockedContext(
  ctx: { offsiteClockInBlocked?: boolean } | null | undefined,
): boolean {
  return ctx?.offsiteClockInBlocked === true;
}

export function isAtOfficeOnlyContext(
  ctx: { availableClockInOptions?: ClockInOptionKey[] } | null | undefined,
): boolean {
  if (!ctx?.availableClockInOptions?.length) return false;
  return ctx.availableClockInOptions.length === 1 && ctx.availableClockInOptions[0] === 'at_office';
}

export function remoteOptionKeysFromContext(
  ctx: { availableClockInOptions?: ClockInOptionKey[]; offsiteClockInBlocked?: boolean } | null | undefined,
  /** Whether the fallback remote list may be shown when context is unavailable (exempt users only). */
  allowFallback = true,
): ClockInOptionKey[] {
  if (isOffsiteBlockedContext(ctx)) return [];
  const fromServer = (ctx?.availableClockInOptions ?? []).filter((k) => k !== 'at_office');
  if (fromServer.length > 0) return fromServer;
  if (ctx == null && allowFallback) return [...FALLBACK_REMOTE_CLOCK_IN_OPTION_KEYS];
  return [];
}

export function labelFromOptionKey(key: string | undefined | null): ClockInOptionLabel | null {
  if (!key || !(key in OPTION_KEY_TO_LABEL)) return null;
  return OPTION_KEY_TO_LABEL[key as ClockInOptionKey];
}

export function labelsForOptionKeys(keys: ClockInOptionKey[]): ClockInOptionLabel[] {
  return keys.map((k) => OPTION_KEY_TO_LABEL[k]);
}

function firstLineOfNotes(notes: string): string {
  const line = notes.split(/\r?\n/, 1)[0]?.trim() ?? '';
  return line;
}

/**
 * Resolves clock-in mode key from stored `checkInNotes`: exact match, or first line for older records that have a user note after the label.
 */
export function optionKeyFromCheckInNotes(notes: string | null | undefined): ClockInOptionKey | null {
  const t = notes?.trim();
  if (!t) return null;
  const candidates = [t, firstLineOfNotes(t)];
  for (const candidate of candidates) {
    for (const key of Object.keys(OPTION_KEY_TO_LABEL) as ClockInOptionKey[]) {
      if (OPTION_KEY_TO_LABEL[key] === candidate) return key;
    }
  }
  return null;
}

/**
 * Key to use for colored mode badges. "At office" only when distance is known and within branch radius.
 * When notes are missing or "at office" is invalid but distance exceeds the radius, returns offsite.
 */
export function resolveDisplayedClockInModeKey(
  notesKey: ClockInOptionKey | null,
  distanceFromWorkplaceMeters: number | null | undefined,
  branchLocationRadiusMeters: number
): ClockInOptionKey | null {
  const dist = distanceFromWorkplaceMeters;
  const outsideRadius = dist != null && dist > branchLocationRadiusMeters;

  if (notesKey === 'at_office') {
    if (dist == null) return null;
    if (outsideRadius) return 'offsite';
    return 'at_office';
  }

  if (notesKey != null) return notesKey;

  if (outsideRadius) return 'offsite';
  return null;
}

/**
 * Mode key for staff/reports list filters; matches {@link resolveDisplayedClockInModeKey} on cards.
 */
export function clockInModeKeyForFilter(
  isPresent: boolean,
  checkInNotes: string | null | undefined,
  distanceFromWorkplaceMeters: number | null | undefined,
  branchLocationRadiusMeters: number
): ClockInOptionKey | null {
  if (!isPresent) return null;
  const notesKey = optionKeyFromCheckInNotes(checkInNotes);
  return resolveDisplayedClockInModeKey(
    notesKey,
    distanceFromWorkplaceMeters,
    branchLocationRadiusMeters
  );
}
