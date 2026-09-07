import { formatZarShort } from '@/lib/site-opportunity/format-potential';

export type BitDrywallStoreFormatKey =
  | 'express'
  | 'mini'
  | 'standard'
  | 'pro'
  | 'hub';

export interface BitDrywallStoreFormat {
  key: BitDrywallStoreFormatKey;
  label: string;
  sizeMinSqm: number;
  sizeMaxSqm: number;
  turnoverMinZAR: number;
  /** Inclusive planning cap; Hub is treated as open-ended above this. */
  turnoverMaxZAR: number;
  turnoverMaxIsOpenEnded: boolean;
}

/**
 * BitDrywall store formats from the planning guide.
 * Overlaps are resolved by stepping up at the next format's lower bound.
 */
export const BITDRYWALL_STORE_FORMATS: readonly BitDrywallStoreFormat[] = [
  {
    key: 'express',
    label: 'Express',
    sizeMinSqm: 100,
    sizeMaxSqm: 150,
    turnoverMinZAR: 500_000,
    turnoverMaxZAR: 900_000,
    turnoverMaxIsOpenEnded: false,
  },
  {
    key: 'mini',
    label: 'Mini',
    sizeMinSqm: 150,
    sizeMaxSqm: 250,
    turnoverMinZAR: 800_000,
    turnoverMaxZAR: 1_300_000,
    turnoverMaxIsOpenEnded: false,
  },
  {
    key: 'standard',
    label: 'Standard',
    sizeMinSqm: 300,
    sizeMaxSqm: 400,
    turnoverMinZAR: 1_200_000,
    turnoverMaxZAR: 2_000_000,
    turnoverMaxIsOpenEnded: false,
  },
  {
    key: 'pro',
    label: 'Pro',
    sizeMinSqm: 500,
    sizeMaxSqm: 700,
    turnoverMinZAR: 2_000_000,
    turnoverMaxZAR: 3_500_000,
    turnoverMaxIsOpenEnded: false,
  },
  {
    key: 'hub',
    label: 'Hub / DC Store',
    sizeMinSqm: 800,
    sizeMaxSqm: 1_500,
    turnoverMinZAR: 3_000_000,
    turnoverMaxZAR: 6_000_000,
    turnoverMaxIsOpenEnded: true,
  },
];

export interface BitDrywallStoreFormatSuggestion {
  formatKey: BitDrywallStoreFormatKey;
  formatLabel: string;
  sizeMinSqm: number;
  sizeMaxSqm: number;
  turnoverMinZAR: number;
  turnoverMaxZAR: number;
  turnoverMaxIsOpenEnded: boolean;
  suggestedSizeSqm: number;
  belowRange: boolean;
  aboveRange: boolean;
}

function roundToNearestTen(n: number): number {
  return Math.round(n / 10) * 10;
}

function interpolateSizeSqm(
  format: BitDrywallStoreFormat,
  monthlyTurnoverZAR: number,
  bandMaxZAR: number,
): number {
  const span = bandMaxZAR - format.turnoverMinZAR;
  const t =
    span <= 0
      ? 0
      : Math.min(
          1,
          Math.max(0, (monthlyTurnoverZAR - format.turnoverMinZAR) / span),
        );
  return roundToNearestTen(
    format.sizeMinSqm + t * (format.sizeMaxSqm - format.sizeMinSqm),
  );
}

/**
 * Map modelled monthly turnover to a BitDrywall format and interpolated office size.
 * Steps up at the next format's lower bound so overlapping bands prefer the larger store.
 */
export function suggestBitDrywallStoreFormat(
  monthlyTurnoverZAR: number,
): BitDrywallStoreFormatSuggestion {
  const formats = BITDRYWALL_STORE_FORMATS;
  const smallest = formats[0]!;
  const largest = formats[formats.length - 1]!;
  const turnover = Number.isFinite(monthlyTurnoverZAR)
    ? Math.max(0, monthlyTurnoverZAR)
    : 0;

  const belowRange = turnover < smallest.turnoverMinZAR;
  const aboveRange = turnover > largest.turnoverMaxZAR;

  let chosen = smallest;
  for (const format of formats) {
    if (turnover >= format.turnoverMinZAR) chosen = format;
  }

  const chosenIndex = formats.findIndex((format) => format.key === chosen.key);
  const next = chosenIndex >= 0 ? formats[chosenIndex + 1] : undefined;
  const bandMaxZAR = next?.turnoverMinZAR ?? chosen.turnoverMaxZAR;

  let suggestedSizeSqm: number;
  if (belowRange) {
    suggestedSizeSqm = smallest.sizeMinSqm;
  } else if (aboveRange) {
    suggestedSizeSqm = largest.sizeMaxSqm;
  } else {
    suggestedSizeSqm = interpolateSizeSqm(chosen, turnover, bandMaxZAR);
  }

  return {
    formatKey: chosen.key,
    formatLabel: chosen.label,
    sizeMinSqm: chosen.sizeMinSqm,
    sizeMaxSqm: chosen.sizeMaxSqm,
    turnoverMinZAR: chosen.turnoverMinZAR,
    turnoverMaxZAR: chosen.turnoverMaxZAR,
    turnoverMaxIsOpenEnded: chosen.turnoverMaxIsOpenEnded,
    suggestedSizeSqm,
    belowRange,
    aboveRange,
  };
}

export function formatStoreFormatSizeRange(
  suggestion: Pick<BitDrywallStoreFormatSuggestion, 'sizeMinSqm' | 'sizeMaxSqm'>,
): string {
  return `${suggestion.sizeMinSqm.toLocaleString()}–${suggestion.sizeMaxSqm.toLocaleString()} m²`;
}

export function formatStoreFormatTurnoverRange(
  suggestion: Pick<
    BitDrywallStoreFormatSuggestion,
    'turnoverMinZAR' | 'turnoverMaxZAR' | 'turnoverMaxIsOpenEnded'
  >,
): string {
  const high = formatZarShort(suggestion.turnoverMaxZAR);
  const suffix = suggestion.turnoverMaxIsOpenEnded ? '+' : '';
  return `${formatZarShort(suggestion.turnoverMinZAR)}–${high}${suffix}`;
}

export function formatStoreFormatSummary(
  suggestion: Pick<
    BitDrywallStoreFormatSuggestion,
    'formatLabel' | 'suggestedSizeSqm'
  >,
): string {
  return `${suggestion.formatLabel} · ${suggestion.suggestedSizeSqm.toLocaleString()} m²`;
}

/** Missing/undefined defaults to on so existing saved prefs keep the suggestion. */
export function isStoreSizeSuggestionEnabled(
  value: boolean | null | undefined,
): boolean {
  return value !== false;
}
