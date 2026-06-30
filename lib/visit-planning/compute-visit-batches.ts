import { addWeeks, format, parseISO, startOfDay } from 'date-fns';

export function nextDayOfWeekOnOrAfter(startDate: Date, visitDayOfWeek: number): Date {
  const anchor = startOfDay(startDate);
  const currentDay = anchor.getDay();
  const daysUntil = (visitDayOfWeek - currentDay + 7) % 7;
  const result = new Date(anchor);
  result.setDate(result.getDate() + daysUntil);
  return result;
}

export function getBatchVisitDate(
  startDate: Date,
  visitDayOfWeek: number,
  batchIndex: number
): Date {
  const firstVisit = nextDayOfWeekOnOrAfter(startDate, visitDayOfWeek);
  return addWeeks(firstVisit, batchIndex);
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
  visitDayOfWeek: number,
  batchSize: number
): VisitBatchPreview[] {
  if (!startDateIso || clients.length === 0) return [];

  const startDate = startOfDay(parseISO(startDateIso.slice(0, 10)));
  const batches = chunkItems(clients, batchSize);

  return batches.map((batchClients, batchIndex) => {
    const visitDate = getBatchVisitDate(startDate, visitDayOfWeek, batchIndex);
    return {
      batchIndex,
      visitDate,
      visitDateLabel: format(visitDate, 'EEE, d MMM yyyy'),
      clients: batchClients,
    };
  });
}

export const VISIT_DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;
