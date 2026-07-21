import { addWeeks, format, parseISO, startOfDay } from 'date-fns';

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
};

export type VisitBatchPreview = {
  batchIndex: number;
  visitDate: Date;
  visitDateLabel: string;
  clients: VisitBatchPreviewClient[];
};

export function computeVisitBatchPreviews(
  clients: VisitBatchPreviewClient[],
  startDateIso: string,
  visitDaysOfWeek: number[],
  batchSize: number
): VisitBatchPreview[] {
  if (!startDateIso || clients.length === 0 || visitDaysOfWeek.length === 0) {
    return [];
  }

  const startDate = startOfDay(parseISO(startDateIso.slice(0, 10)));
  const batches = chunkItems(clients, batchSize);

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
