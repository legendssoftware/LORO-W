import {
  TRAVEL_ANALYSIS_DISCLAIMER,
  type TravelAnalysisArea,
  type TravelAnalysisDailyRow,
  type TravelAnalysisDocument,
  type TravelAnalysisPayload,
  type TravelAnalysisStopRow,
} from '@/lib/travel-analysis/travel-analysis-types';

const COMMON_AREA_CAP = 12;
const ADDRESS_NOISE =
  /^(south africa|botswana|zimbabwe|namibia|lesotho|eswatini|mozambique|zambia|general|kzn|gauteng|western cape|eastern cape|limpopo|mpumalanga|free state|north west|northern cape|0000|n\/a|-)$/i;

const EM_DASH = '—';

/**
 * Parse a workbook fuel cell (`'-'`, numeric string, or formatted `R 23.45/L`) for totals.
 */
export function parseFuelNumber(value: string | number | null | undefined): number {
  if (value == null || value === '' || value === '-') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Format a minute total as `11h 43m` (hours omitted under 60 minutes).
 */
export function formatHoursMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0m';
  const mins = Math.round(totalMinutes);
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours === 0) return `${rem}m`;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${rem}m`;
}

function isBlankPlace(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' || trimmed === '-';
}

function displayPlace(value: string | null | undefined): string {
  if (isBlankPlace(value)) return EM_DASH;
  return value!.trim();
}

function displayCell(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (trimmed === '' || trimmed === '-') return EM_DASH;
  return trimmed;
}

/**
 * Cluster key for a stop: first meaningful address parts, else rounded lat/lng.
 */
export function normalizeStopArea(stop: {
  place: string;
  lat: string;
  lng: string;
}): string {
  const raw = stop.place?.trim() ?? '';
  if (raw && raw !== '-') {
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && !ADDRESS_NOISE.test(part));
    if (parts.length > 0) return parts.slice(0, 2).join(', ');
    return raw;
  }
  const lat = Number(stop.lat);
  const lng = Number(stop.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
  return 'Unknown';
}

/**
 * Rank stop clusters by count, then dwell. Caps at 12 rows.
 */
export function clusterCommonAreas(stops: TravelAnalysisStopRow[]): TravelAnalysisArea[] {
  const totalDwell = stops.reduce((sum, stop) => sum + Math.max(0, stop.dwellMin || 0), 0);
  const byArea = new Map<string, { stops: number; dwellMin: number }>();
  for (const stop of stops) {
    const area = normalizeStopArea(stop);
    const existing = byArea.get(area) ?? { stops: 0, dwellMin: 0 };
    existing.stops += 1;
    existing.dwellMin += Math.max(0, stop.dwellMin || 0);
    byArea.set(area, existing);
  }
  return [...byArea.entries()]
    .map(([area, stats]) => ({
      area,
      stops: stats.stops,
      dwellMin: stats.dwellMin,
      dwellSharePct:
        totalDwell > 0 ? Math.round((stats.dwellMin / totalDwell) * 100) : 0,
    }))
    .sort((a, b) => b.stops - a.stops || b.dwellMin - a.dwellMin || a.area.localeCompare(b.area))
    .slice(0, COMMON_AREA_CAP);
}

function mostFrequentPlace(values: string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (isBlankPlace(value)) continue;
    const key = value.trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [place, count] of counts) {
    if (count > bestCount) {
      best = place;
      bestCount = count;
    }
  }
  return best ?? EM_DASH;
}

function hasMovement(row: TravelAnalysisDailyRow): boolean {
  return row.distanceKm > 0 || row.recordedDistanceKm > 0 || row.travelMin > 0;
}

function fuelGradeLabel(fuelTypeLabel: string): string {
  return /diesel/i.test(fuelTypeLabel) ? 'Diesel 50 ppm' : 'Unleaded 95';
}

function formatClaimsLabel(amount: number, count: number): string {
  const zar = Number.isFinite(amount) ? Math.round(amount) : 0;
  const n = Number.isFinite(count) ? Math.round(count) : 0;
  if (zar <= 0 && n <= 0) return EM_DASH;
  return `R${zar} - ${n}`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildTravelAnalysisFilename(fromYmd: string, toYmd: string): string {
  return `travel-analysis-${fromYmd}-to-${toYmd}.pdf`;
}

/**
 * Turn the travel-analysis API payload into a PDF-ready briefing document.
 */
export function buildTravelAnalysisDocument(
  payload: TravelAnalysisPayload,
  userNameFallback: string,
): TravelAnalysisDocument {
  const summary = payload.summary;
  const userName = summary?.user?.trim() || userNameFallback.trim() || 'Staff member';
  const daily = payload.daily ?? [];
  const stops = payload.stops ?? [];

  const travelMin = summary?.travelMin ?? daily.reduce((sum, row) => sum + row.travelMin, 0);
  const stopMin = summary?.stopMin ?? daily.reduce((sum, row) => sum + row.stopMin, 0);
  const timeTotal = travelMin + stopMin;
  const fuelLitres =
    summary?.fuelLitresUsed ??
    round2(daily.reduce((sum, row) => sum + parseFuelNumber(row.fuelLitres), 0));
  const fuelZar =
    summary?.fuelRefundAmount ??
    round2(daily.reduce((sum, row) => sum + parseFuelNumber(row.fuelRand), 0));

  const movementDays = daily.filter(hasMovement);
  const movementDaySet = new Set(movementDays.map((row) => row.date));
  const stopsOnMovementDays = stops.filter((stop) => movementDaySet.has(stop.date));

  const dwellBrief = stops.filter((stop) => stop.dwellMin < 15).length;
  const dwellWorking = stops.filter((stop) => stop.dwellMin >= 15 && stop.dwellMin <= 60).length;
  const dwellLong = stops.filter((stop) => stop.dwellMin > 60).length;

  const fuelDays = daily.map((row) => ({
    date: row.date,
    price: displayCell(row.fuelPricePerLitre),
    litres: displayCell(row.fuelLitres),
    zar: displayCell(row.fuelRand),
  }));
  const daysWithFuel = fuelDays.filter((row) => row.litres !== EM_DASH || row.zar !== EM_DASH).length;

  return {
    meta: {
      title: `Travel analysis — ${userName}`,
      userName,
      organisationName: payload.organisationName?.trim() || 'Organisation',
      fromYmd: payload.fromYmd,
      toYmd: payload.toYmd,
      generatedAtIso: payload.generatedAtIso,
      timezone: payload.timezone || 'Africa/Johannesburg',
    },
    kpis: {
      billableKm: summary?.distanceKm ?? round1(daily.reduce((sum, row) => sum + row.distanceKm, 0)),
      recordedKm:
        summary?.recordedDistanceKm ??
        round1(daily.reduce((sum, row) => sum + row.recordedDistanceKm, 0)),
      commuteDeductedKm:
        summary?.commuteDeductedKm ??
        round1(daily.reduce((sum, row) => sum + row.commuteDeductedKm, 0)),
      visits: payload.visitCount ?? summary?.visits ?? 0,
      stops: summary?.stops ?? stops.length,
      travelMin,
      stopMin,
      fuelLitres,
      fuelZar,
      claimsLabel: formatClaimsLabel(
        summary?.petrolClaimAmount ?? 0,
        summary?.petrolClaimCount ?? 0,
      ),
      vehicle: displayCell(summary?.vehicleLabel),
      fuelType: displayCell(summary?.fuelTypeLabel),
      ratedKmPerLitre: displayCell(summary?.ratedKmPerLitreLabel),
      country: displayCell(summary?.country),
      region: displayCell(summary?.region),
      branch: displayCell(summary?.branch),
    },
    vehicleBasis: {
      vehicle: displayCell(summary?.vehicleLabel),
      fuelType: displayCell(summary?.fuelTypeLabel),
      fuelGrade: fuelGradeLabel(summary?.fuelTypeLabel ?? 'Petrol'),
      ratedKmPerLitre: displayCell(summary?.ratedKmPerLitreLabel),
      isFleetDefault: /fleet default/i.test(summary?.ratedKmPerLitreLabel ?? ''),
      country: displayCell(summary?.country),
      region: displayCell(summary?.region),
    },
    days: daily.map((row) => ({
      date: row.date,
      recordedKm: row.recordedDistanceKm,
      billableKm: row.distanceKm,
      travelLabel: formatHoursMinutes(row.travelMin),
      stopLabel: formatHoursMinutes(row.stopMin),
      start: displayPlace(row.startPlace),
      end: displayPlace(row.endPlace),
      region: displayCell(row.region),
      fuelLitres: displayCell(row.fuelLitres),
      fuelRand: displayCell(row.fuelRand),
    })),
    areas: clusterCommonAreas(stops),
    patterns: {
      travelMin,
      stopMin,
      travelSharePct: timeTotal > 0 ? Math.round((travelMin / timeTotal) * 100) : 0,
      stopSharePct: timeTotal > 0 ? Math.round((stopMin / timeTotal) * 100) : 0,
      daysWithMovement: movementDays.length,
      avgKmPerTravelDay:
        movementDays.length > 0
          ? round1(movementDays.reduce((sum, row) => sum + row.distanceKm, 0) / movementDays.length)
          : null,
      avgStopsPerTravelDay:
        movementDays.length > 0
          ? round1(stopsOnMovementDays.length / movementDays.length)
          : null,
      avgTravelMinPerTravelDay:
        movementDays.length > 0
          ? Math.round(movementDays.reduce((sum, row) => sum + row.travelMin, 0) / movementDays.length)
          : null,
      dwellBrief,
      dwellWorking,
      dwellLong,
      typicalStart: mostFrequentPlace(daily.map((row) => row.startPlace)),
      typicalEnd: mostFrequentPlace(daily.map((row) => row.endPlace)),
      movingSampleCount: payload.movingSampleCount ?? 0,
      stoppedSampleCount: payload.stoppedSampleCount ?? 0,
    },
    fuelDays,
    fuelTotals: {
      litres: fuelLitres,
      zar: fuelZar,
      daysWithFuel,
    },
    disclaimer: TRAVEL_ANALYSIS_DISCLAIMER,
  };
}
