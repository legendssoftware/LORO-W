import {
  TRAVEL_ANALYSIS_DISCLAIMER,
  type TravelAnalysisArea,
  type TravelAnalysisClientRow,
  type TravelAnalysisDailyRow,
  type TravelAnalysisDocument,
  type TravelAnalysisPayload,
  type TravelAnalysisStopRow,
  type TravelAnalysisVisitLine,
  type TravelAnalysisVisitRow,
} from '@/lib/travel-analysis/travel-analysis-types';

const COMMON_AREA_CAP = 12;
const ADDRESS_NOISE =
  /^(south africa|botswana|zimbabwe|namibia|lesotho|eswatini|mozambique|zambia|general|kzn|gauteng|western cape|eastern cape|limpopo|mpumalanga|free state|north west|northern cape|0000|n\/a|-)$/i;
const PLUS_CODE = /[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i;
const NUMERIC_ONLY = /^\d+[a-z]?$/i;

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
 * Street plus suburb. A leading house number is kept with the street, and an
 * Open Location Code is dropped so the locality remains.
 */
function meaningfulAddressParts(raw: string): string[] {
  const stripped = raw.replace(PLUS_CODE, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!stripped || stripped === '-') return [];
  const parts = stripped
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !ADDRESS_NOISE.test(part) && !PLUS_CODE.test(part));
  const merged: string[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] ?? '';
    const next = parts[index + 1];
    if (NUMERIC_ONLY.test(part) && next) {
      merged.push(`${part} ${next}`);
      index += 1;
      continue;
    }
    merged.push(part);
  }
  return merged;
}

/**
 * Cluster key for a stop: street and suburb, else rounded lat/lng.
 */
export function normalizeStopArea(stop: {
  place: string;
  lat: string;
  lng: string;
}): string {
  const raw = stop.place?.trim() ?? '';
  if (raw && raw !== '-') {
    const parts = meaningfulAddressParts(raw);
    if (parts.length > 0) return parts.slice(0, 2).join(', ');
  }
  const lat = Number(stop.lat);
  const lng = Number(stop.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
  return 'Unknown';
}

/** Province only, so `Gauteng · South Africa` fits the day table. */
export function provinceLabel(region: string | null | undefined): string {
  const trimmed = region?.trim() ?? '';
  if (trimmed === '' || trimmed === '-') return EM_DASH;
  const province = trimmed.split('·')[0]?.trim();
  return province || trimmed;
}

/** One country/region line. Region often already names the country. */
export function formatCountryRegion(country: string, region: string): string {
  if (country === EM_DASH) return region;
  if (region === EM_DASH) return country;
  if (region.toLowerCase().includes(country.toLowerCase())) return region;
  return `${country} · ${region}`;
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
  return /diesel/i.test(fuelTypeLabel)
    ? 'Diesel (national avg)'
    : 'Gasoline (national avg)';
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

function named(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (trimmed === '' || trimmed === '-') return '';
  return trimmed;
}

function finitePair(lat: string, lng: string): { lat: number; lng: number } | null {
  if (lat.trim() === '-' || lng.trim() === '-' || lat.trim() === '' || lng.trim() === '') return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { lat: latitude, lng: longitude };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const left = sorted[mid - 1];
  const right = sorted[mid];
  if (left == null || right == null) return null;
  return (left + right) / 2;
}

/** Straight-line kilometres between two WGS84 points. */
function haversineKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

type VisitDraft = TravelAnalysisVisitLine & {
  minutes: number;
  lat: string;
  lng: string;
  place: string;
};

function visitDrafts(visits: TravelAnalysisVisitRow[]): VisitDraft[] {
  return visits
    .map((visit) => {
      const siteName = named(visit.siteName);
      const client = named(visit.client) || siteName || EM_DASH;
      const minutes = Math.max(0, Math.round(visit.minutes || 0));
      return {
        date: visit.date,
        time: named(visit.time) || EM_DASH,
        client,
        siteName: siteName || EM_DASH,
        area: normalizeStopArea({ place: visit.place, lat: visit.lat, lng: visit.lng }),
        method: named(visit.method) || 'Other',
        minutes,
        timeLabel: formatHoursMinutes(minutes),
        lat: visit.lat,
        lng: visit.lng,
        place: visit.place ?? '',
      };
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.time.localeCompare(b.time) ||
        a.client.localeCompare(b.client),
    );
}

function homePoint(
  daily: TravelAnalysisDailyRow[],
  stops: TravelAnalysisStopRow[],
  visits: VisitDraft[],
): { lat: number; lng: number } | null {
  const start = mostFrequentPlace(daily.map((row) => row.startPlace));
  if (start === EM_DASH) return null;
  const homeArea = normalizeStopArea({ place: start, lat: '-', lng: '-' });
  const latitudes: number[] = [];
  const longitudes: number[] = [];
  const push = (place: string, lat: string, lng: string) => {
    const coords = finitePair(lat, lng);
    if (!coords) return;
    const samePlace = place.trim() === start;
    const sameArea = normalizeStopArea({ place, lat, lng }) === homeArea;
    if (!samePlace && !sameArea) return;
    latitudes.push(coords.lat);
    longitudes.push(coords.lng);
  };
  for (const stop of stops) push(stop.place, stop.lat, stop.lng);
  for (const visit of visits) push(visit.place, visit.lat, visit.lng);
  const lat = median(latitudes);
  const lng = median(longitudes);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function mostCommonArea(visits: VisitDraft[]): string {
  const counts = new Map<string, number>();
  for (const visit of visits) {
    counts.set(visit.area, (counts.get(visit.area) ?? 0) + 1);
  }
  let best = EM_DASH;
  let bestCount = 0;
  for (const [area, count] of counts) {
    if (count > bestCount || (count === bestCount && area.localeCompare(best) < 0)) {
      best = area;
      bestCount = count;
    }
  }
  return best;
}

/**
 * One row per client and recorded site. Km from home is straight-line distance
 * from the most common daily start place.
 */
function clientRows(visits: VisitDraft[], home: { lat: number; lng: number } | null): TravelAnalysisClientRow[] {
  const groups = new Map<string, VisitDraft[]>();
  for (const visit of visits) {
    const key = `${visit.client}\u0000${visit.siteName}`;
    const list = groups.get(key) ?? [];
    list.push(visit);
    groups.set(key, list);
  }
  return [...groups.values()]
    .map((group) => {
      const first = group[0];
      const minutes = group.reduce((sum, visit) => sum + visit.minutes, 0);
      const latitudes: number[] = [];
      const longitudes: number[] = [];
      for (const visit of group) {
        const coords = finitePair(visit.lat, visit.lng);
        if (!coords) continue;
        latitudes.push(coords.lat);
        longitudes.push(coords.lng);
      }
      const lat = median(latitudes);
      const lng = median(longitudes);
      const km =
        home && lat != null && lng != null ? round1(haversineKm(home.lat, home.lng, lat, lng)) : null;
      return {
        client: first?.client ?? EM_DASH,
        siteName: first?.siteName ?? EM_DASH,
        area: mostCommonArea(group),
        visits: group.length,
        timeLabel: formatHoursMinutes(minutes),
        whatsApp: group.filter((visit) => visit.method === 'WhatsApp').length,
        kmFromHome: km,
      };
    })
    .sort(
      (a, b) =>
        b.visits - a.visits ||
        a.client.localeCompare(b.client) ||
        a.siteName.localeCompare(b.siteName),
    );
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
  const draftedVisits = visitDrafts(payload.visits ?? []);
  const visitsByDate = new Map<string, number>();
  for (const visit of draftedVisits) {
    visitsByDate.set(visit.date, (visitsByDate.get(visit.date) ?? 0) + 1);
  }
  const home = homePoint(daily, stops, draftedVisits);

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
      region: formatCountryRegion(displayCell(summary?.country), displayCell(summary?.region)),
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
      visitCount: visitsByDate.get(row.date) ?? 0,
      start: displayPlace(row.startPlace),
      end: displayPlace(row.endPlace),
      region: provinceLabel(row.region),
      fuelPrice: displayCell(row.fuelPricePerLitre),
      fuelLitres: displayCell(row.fuelLitres),
      fuelRand: displayCell(row.fuelRand),
    })),
    areas: clusterCommonAreas(stops),
    visits: draftedVisits.map((visit) => ({
      date: visit.date,
      time: visit.time,
      client: visit.client,
      siteName: visit.siteName,
      area: visit.area,
      method: visit.method,
      timeLabel: visit.timeLabel,
    })),
    clients: clientRows(draftedVisits, home),
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
      typicalStart: normalizeStopArea({
        place: mostFrequentPlace(daily.map((row) => row.startPlace)),
        lat: '-',
        lng: '-',
      }),
      typicalEnd: normalizeStopArea({
        place: mostFrequentPlace(daily.map((row) => row.endPlace)),
        lat: '-',
        lng: '-',
      }),
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
