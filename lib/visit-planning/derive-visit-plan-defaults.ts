import { format, parseISO } from 'date-fns';
import type { VisitPlanScheduleSlot } from '@/api/endpoints/user';

export type VisitPlanFormDefaults = {
  startDate: string;
  visitDaysOfWeek: number[];
  batchSize: number;
  selectedClientIds: number[];
  hasActivePlan: boolean;
};

function inferBatchSizeFromSlots(slots: VisitPlanScheduleSlot[]): number {
  const counts = slots.map((slot) => slot.tasks.length).filter((count) => count > 0);
  if (counts.length === 0) return 10;

  const frequency = new Map<number, number>();
  for (const count of counts) {
    frequency.set(count, (frequency.get(count) ?? 0) + 1);
  }

  let batchSize = counts[0];
  let highestFrequency = 0;
  for (const [count, freq] of frequency) {
    if (freq > highestFrequency || (freq === highestFrequency && count > batchSize)) {
      batchSize = count;
      highestFrequency = freq;
    }
  }

  return Math.min(50, Math.max(1, batchSize));
}

export function deriveVisitPlanDefaultsFromActiveSchedule(
  slots: VisitPlanScheduleSlot[],
  assignedClientIds: number[]
): VisitPlanFormDefaults {
  const today = format(new Date(), 'yyyy-MM-dd');

  if (slots.length === 0) {
    return {
      startDate: today,
      visitDaysOfWeek: [2],
      batchSize: 10,
      selectedClientIds: [...assignedClientIds],
      hasActivePlan: false,
    };
  }

  const sortedSlots = [...slots].sort(
    (a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
  );

  const firstSlot = sortedSlots.find((slot) => slot.visitDate);
  const startDate = firstSlot?.visitDate
    ? format(parseISO(firstSlot.visitDate.slice(0, 10)), 'yyyy-MM-dd')
    : today;

  const visitDaysOfWeek = [
    ...new Set(
      sortedSlots
        .filter((slot) => slot.visitDate)
        .map((slot) => parseISO(slot.visitDate).getDay())
    ),
  ].sort((a, b) => a - b);

  const clientIdsFromPlan = [
    ...new Set(
      sortedSlots.flatMap((slot) =>
        slot.tasks
          .map((task) => task.clientUid)
          .filter((uid): uid is number => uid != null && uid > 0)
      )
    ),
  ];

  return {
    startDate,
    visitDaysOfWeek: visitDaysOfWeek.length > 0 ? visitDaysOfWeek : [2],
    batchSize: inferBatchSizeFromSlots(sortedSlots),
    selectedClientIds:
      clientIdsFromPlan.length > 0 ? clientIdsFromPlan : [...assignedClientIds],
    hasActivePlan: true,
  };
}
