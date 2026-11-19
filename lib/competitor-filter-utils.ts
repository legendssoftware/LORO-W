import type { CompetitorStatusValue } from '@/api/types/competitors';

export const COMPETITOR_STATUS_VALUES = [
  'active',
  'inactive',
  'acquired',
  'bankrupt',
  'merged',
  'potential',
  'watching',
] as const satisfies readonly CompetitorStatusValue[];

export type CompetitorStatusFilterValue = 'all' | CompetitorStatusValue;

export const COMPETITOR_STATUS_FILTER_OPTIONS: {
  value: CompetitorStatusFilterValue;
  labelKey: string;
}[] = [
  { value: 'all', labelKey: 'actions.allStatuses' },
  ...COMPETITOR_STATUS_VALUES.map((v) => ({
    value: v,
    labelKey: `chrome.competitors.status.${v}`,
  })),
];

export type CompetitorDirectFilterValue = 'all' | 'direct' | 'indirect';

export function competitorDirectFilterToBool(
  v: CompetitorDirectFilterValue
): boolean | undefined {
  if (v === 'direct') return true;
  if (v === 'indirect') return false;
  return undefined;
}

export type CompetitorThreatFilterValue = 'all' | '1' | '2' | '3' | '4' | '5';

export function competitorThreatFilterToNumber(
  v: CompetitorThreatFilterValue
): number | undefined {
  if (v === 'all') return undefined;
  return Number(v);
}
