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

/** When API omits outsideBranchRadiusMessage (older server). */
export const OUTSIDE_BRANCH_RADIUS_MESSAGE_FALLBACK =
  'You are outside the office check-in radius.';

/** Shown when location context could not be loaded. */
export const LOCATION_CONTEXT_UNAVAILABLE_MESSAGE =
  'Could not verify your location. Choose how you are starting your shift, or retry location.';

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

export function isAtOfficeOnlyContext(
  ctx: { availableClockInOptions?: ClockInOptionKey[] } | null | undefined,
): boolean {
  if (!ctx?.availableClockInOptions?.length) return false;
  return ctx.availableClockInOptions.length === 1 && ctx.availableClockInOptions[0] === 'at_office';
}

export function remoteOptionKeysFromContext(
  ctx: { availableClockInOptions?: ClockInOptionKey[] } | null | undefined,
): ClockInOptionKey[] {
  const fromServer = (ctx?.availableClockInOptions ?? []).filter((k) => k !== 'at_office');
  if (fromServer.length > 0) return fromServer;
  if (ctx == null) return [...FALLBACK_REMOTE_CLOCK_IN_OPTION_KEYS];
  return [];
}

export function labelFromOptionKey(key: string | undefined | null): ClockInOptionLabel | null {
  if (!key || !(key in OPTION_KEY_TO_LABEL)) return null;
  return OPTION_KEY_TO_LABEL[key as ClockInOptionKey];
}

export function labelsForOptionKeys(keys: ClockInOptionKey[]): ClockInOptionLabel[] {
  return keys.map((k) => OPTION_KEY_TO_LABEL[k]);
}

/** Max length for optional user text appended after the mode label (client + server aligned). */
export const CLOCK_IN_ADDITIONAL_NOTE_MAX_LENGTH = 2000;

/**
 * Persists mode label alone, or mode label + optional freeform note (second block after blank line).
 * First line must stay an exact {@link OPTION_KEY_TO_LABEL} value for {@link optionKeyFromCheckInNotes}.
 */
export function buildClockInNotes(
  modeLabel: string,
  additionalNote?: string | null
): string {
  const extra = additionalNote?.trim();
  if (!extra) return modeLabel;
  const clipped = extra.slice(0, CLOCK_IN_ADDITIONAL_NOTE_MAX_LENGTH);
  return `${modeLabel}\n\n${clipped}`;
}

function firstLineOfNotes(notes: string): string {
  const line = notes.split(/\r?\n/, 1)[0]?.trim() ?? '';
  return line;
}

/**
 * Resolves clock-in mode key from stored `checkInNotes`: exact match, or first line when a user note follows.
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
