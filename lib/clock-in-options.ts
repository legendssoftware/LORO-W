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

export function labelFromOptionKey(key: string | undefined | null): ClockInOptionLabel | null {
  if (!key || !(key in OPTION_KEY_TO_LABEL)) return null;
  return OPTION_KEY_TO_LABEL[key as ClockInOptionKey];
}

export function labelsForOptionKeys(keys: ClockInOptionKey[]): ClockInOptionLabel[] {
  return keys.map((k) => OPTION_KEY_TO_LABEL[k]);
}

/** Exact match to app clock-in labels; free-text bulk notes do not resolve to a key. */
export function optionKeyFromCheckInNotes(notes: string | null | undefined): ClockInOptionKey | null {
  const t = notes?.trim();
  if (!t) return null;
  for (const key of Object.keys(OPTION_KEY_TO_LABEL) as ClockInOptionKey[]) {
    if (OPTION_KEY_TO_LABEL[key] === t) return key;
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
