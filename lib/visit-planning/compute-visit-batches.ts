import { addDays, addMonths, addWeeks, addYears, format, parseISO, startOfDay } from 'date-fns';

export function nextDayOfWeekOnOrAfter(startDate: Date, visitDayOfWeek: number): Date {
  const anchor = startOfDay(startDate);
  const currentDay = anchor.getDay();
  const daysUntil = (visitDayOfWeek - currentDay + 7) % 7;
  const result = new Date(anchor);
  result.setDate(result.getDate() + daysUntil);
  return result;
}

/** @deprecated Use visitSlotDates for multi-day scheduling. */
export function getBatchVisitDate(
  startDate: Date,
  visitDayOfWeek: number,
  batchIndex: number
): Date {
  const firstVisit = nextDayOfWeekOnOrAfter(startDate, visitDayOfWeek);
  return addWeeks(firstVisit, batchIndex);
}

export function normalizeVisitDaysOfWeek(visitDaysOfWeek: number[]): number[] {
  return [...new Set(visitDaysOfWeek)].sort((a, b) => a - b);
}

/** Chronological visit slot dates for selected weekdays, repeating weekly. */
export function* visitSlotDates(
  startDate: Date,
  visitDaysOfWeek: number[]
): Generator<Date> {
  const days = normalizeVisitDaysOfWeek(visitDaysOfWeek);
  if (days.length === 0) return;

  const anchor = startOfDay(startDate);
  let weekOffset = 0;

  while (true) {
    const candidates = days.map((dow) =>
      addWeeks(nextDayOfWeekOnOrAfter(anchor, dow), weekOffset)
    );
    const valid =
      weekOffset === 0
        ? candidates.filter((d) => d.getTime() >= anchor.getTime())
        : candidates;
    valid.sort((a, b) => a.getTime() - b.getTime());
    for (const date of valid) {
      yield date;
    }
    weekOffset++;
  }
}

export function getVisitSlotDate(
  startDate: Date,
  visitDaysOfWeek: number[],
  slotIndex: number
): Date {
  const generator = visitSlotDates(startDate, visitDaysOfWeek);
  let result: Date | undefined;
  for (let i = 0; i <= slotIndex; i++) {
    const next = generator.next();
    if (next.done) break;
    result = next.value;
  }
  if (!result) {
    throw new Error('Unable to compute visit slot date');
  }
  return result;
}

export function chunkItems<T>(items: T[], batchSize: number): T[][] {
  const size = Math.max(1, batchSize);
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export type VisitBatchPreviewClient = {
  uid: number;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
};

const VISIT_REGION_MAX_KM = 40;

type GeoPoint = { latitude: number; longitude: number };

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const earthKm = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

function nearestKmToGroup(point: GeoPoint, group: GeoPoint[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const member of group) {
    const distance = haversineKm(point, member);
    if (distance < best) best = distance;
  }
  return best;
}

function orderByNearestNeighbour<T extends GeoPoint>(items: T[], origin: GeoPoint): T[] {
  const remaining = [...items];
  const ordered: T[] = [];
  let anchor: GeoPoint = origin;
  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = haversineKm(anchor, remaining[0]);
    for (let index = 1; index < remaining.length; index++) {
      const distance = haversineKm(anchor, remaining[index]);
      if (distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    }
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    anchor = next;
  }
  return ordered;
}

/** Mirrors server clusterIntoDrivingDays so the plan preview matches saved days. */
function clusterIntoDrivingDays<T extends GeoPoint>(
  items: T[],
  origin: GeoPoint | null,
  dailyCapacity: number
): T[][] {
  const capacity = Math.max(1, dailyCapacity);
  const remaining = [...items];
  const days: T[][] = [];
  let anchor: GeoPoint | null = origin;

  while (remaining.length > 0) {
    let seedIndex = 0;
    if (anchor) {
      let best = haversineKm(anchor, remaining[0]);
      for (let index = 1; index < remaining.length; index++) {
        const distance = haversineKm(anchor, remaining[index]);
        if (distance < best) {
          best = distance;
          seedIndex = index;
        }
      }
    }
    const [seed] = remaining.splice(seedIndex, 1);
    const day: T[] = [seed];
    while (day.length < capacity && remaining.length > 0) {
      let bestIndex = 0;
      let bestDistance = nearestKmToGroup(remaining[0], day);
      for (let index = 1; index < remaining.length; index++) {
        const distance = nearestKmToGroup(remaining[index], day);
        if (distance < bestDistance) {
          bestIndex = index;
          bestDistance = distance;
        }
      }
      if (bestDistance > VISIT_REGION_MAX_KM) break;
      const [next] = remaining.splice(bestIndex, 1);
      day.push(next);
    }
    const ordered = orderByNearestNeighbour(day, anchor ?? seed);
    days.push(ordered);
    const latitude = ordered.reduce((sum, point) => sum + point.latitude, 0) / ordered.length;
    const longitude = ordered.reduce((sum, point) => sum + point.longitude, 0) / ordered.length;
    anchor = { latitude, longitude };
  }

  return days;
}

export type VisitBatchPreview = {
  batchIndex: number;
  visitDate: Date;
  visitDateLabel: string;
  clients: VisitBatchPreviewClient[];
};

export type RepetitionTypeValue =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'YEARLY';

/** Count visit task instances for a series (first task + repeats until end date). */
export function estimateRecurringInstanceCount(
  firstVisitDate: Date,
  repetitionType: RepetitionTypeValue,
  repetitionDeadline: Date
): number {
  if (repetitionType === 'NONE') {
    return 1;
  }

  const startDate = startOfDay(firstVisitDate);
  const endDate = startOfDay(repetitionDeadline);

  if (endDate <= startDate) {
    return 1;
  }

  let count = 1;
  let currentDate = new Date(startDate);

  while (currentDate < endDate) {
    let nextDate: Date;
    switch (repetitionType) {
      case 'DAILY':
        nextDate = addDays(currentDate, 1);
        break;
      case 'WEEKLY':
        nextDate = addWeeks(currentDate, 1);
        break;
      case 'MONTHLY':
        nextDate = addMonths(currentDate, 1);
        break;
      case 'YEARLY':
        nextDate = addYears(currentDate, 1);
        break;
      default:
        return count;
    }

    if (nextDate > endDate) {
      break;
    }

    count++;
    currentDate = nextDate;
  }

  return count;
}

export function formatRecurrenceSummaryLabel(
  repetitionType: RepetitionTypeValue,
  repetitionDeadlineIso: string,
  estimatedInstancesPerClient: number
): string {
  const typeLabel = repetitionType.toLowerCase();
  const endLabel = format(parseISO(repetitionDeadlineIso.slice(0, 10)), 'd MMM yyyy');
  return `Repeats ${typeLabel} until ${endLabel} (~${estimatedInstancesPerClient} visit${
    estimatedInstancesPerClient === 1 ? '' : 's'
  } per client)`;
}

function asGeoPoint(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): GeoPoint | null {
  if (latitude == null || longitude == null) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

export function computeVisitBatchPreviews(
  clients: VisitBatchPreviewClient[],
  startDateIso: string,
  visitDaysOfWeek: number[],
  batchSize: number,
  origin?: { latitude: number; longitude: number } | null
): VisitBatchPreview[] {
  if (!startDateIso || clients.length === 0 || visitDaysOfWeek.length === 0) {
    return [];
  }

  const located = clients.flatMap((client) => {
    const point = asGeoPoint(client.latitude, client.longitude);
    if (!point) return [];
    return [{ ...client, latitude: point.latitude, longitude: point.longitude }];
  });
  if (located.length === 0) return [];

  const anchor = asGeoPoint(origin?.latitude, origin?.longitude);

  const startDate = startOfDay(parseISO(startDateIso.slice(0, 10)));
  const batches = clusterIntoDrivingDays(located, anchor, batchSize);

  return batches.map((batchClients, batchIndex) => {
    const visitDate = getVisitSlotDate(startDate, visitDaysOfWeek, batchIndex);
    return {
      batchIndex,
      visitDate,
      visitDateLabel: format(visitDate, 'EEE, d MMM yyyy'),
      clients: batchClients,
    };
  });
}

export const VISIT_DAY_OPTIONS = [
  { value: 0, label: 'Sunday', shortLabel: 'Sun' },
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' },
] as const;

export const VISIT_DAY_PRESETS = {
  weekdays: [1, 2, 3, 4, 5],
  monTue: [1, 2],
} as const;
