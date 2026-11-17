import type { LeadActivityCounts } from '@/api/types/reports-lead-activity';

export type LeadActivityBucketKey =
  | 'untouched'
  | 'pendingTouched'
  | 'review'
  | 'approved'
  | 'converted'
  | 'declined'
  | 'cancelled'
  | 'discarded'
  | 'deleted';

export interface LeadActivityBucket {
  key: LeadActivityBucketKey;
  label: string;
  color: string;
}

/** Mutually exclusive import-book statuses, in pipeline order. */
export const LEAD_ACTIVITY_BUCKETS: readonly LeadActivityBucket[] = [
  { key: 'untouched', label: 'Untouched', color: 'hsl(215 16% 47%)' },
  { key: 'pendingTouched', label: 'Pending, worked', color: 'hsl(217 91% 60%)' },
  { key: 'review', label: 'Review', color: 'hsl(262 83% 58%)' },
  { key: 'approved', label: 'Approved', color: 'hsl(189 94% 43%)' },
  { key: 'converted', label: 'Converted', color: 'hsl(142 76% 36%)' },
  { key: 'declined', label: 'Declined', color: 'hsl(38 92% 50%)' },
  { key: 'cancelled', label: 'Cancelled', color: 'hsl(25 95% 53%)' },
  { key: 'discarded', label: 'Discarded', color: 'hsl(0 84% 60%)' },
  { key: 'deleted', label: 'Deleted', color: 'hsl(240 5% 34%)' },
] as const;

export function leadActivityBucketValue(counts: LeadActivityCounts, key: LeadActivityBucketKey): number {
  switch (key) {
    case 'untouched':
      return counts.untouched;
    case 'pendingTouched':
      return counts.pendingTouched;
    case 'review':
      return counts.review;
    case 'approved':
      return counts.approved;
    case 'converted':
      return counts.converted;
    case 'declined':
      return counts.declined;
    case 'cancelled':
      return counts.cancelled;
    case 'discarded':
      return counts.discarded;
    case 'deleted':
      return counts.deleted;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
