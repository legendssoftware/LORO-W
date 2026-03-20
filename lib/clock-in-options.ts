import type { ClockInOptionKey } from '@/api/types/attendance';

/** Labels sent as checkInNotes (aligned with server / mobile). */
export const CLOCK_IN_OPTION_LABELS = [
  'At office',
  'Work from Home',
  'Starting from home',
  'Offsite',
] as const;

export type ClockInOptionLabel = (typeof CLOCK_IN_OPTION_LABELS)[number];

export const OPTION_KEY_TO_LABEL: Record<ClockInOptionKey, ClockInOptionLabel> = {
  at_office: 'At office',
  work_from_home: 'Work from Home',
  starting_from_home: 'Starting from home',
  offsite: 'Offsite',
};

export function labelFromOptionKey(key: string | undefined | null): ClockInOptionLabel | null {
  if (!key || !(key in OPTION_KEY_TO_LABEL)) return null;
  return OPTION_KEY_TO_LABEL[key as ClockInOptionKey];
}

export function labelsForOptionKeys(keys: ClockInOptionKey[]): ClockInOptionLabel[] {
  return keys.map((k) => OPTION_KEY_TO_LABEL[k]);
}
