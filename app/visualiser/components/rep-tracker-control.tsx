'use client';

import type { BranchListItem } from '@/api/types/branch';
import type { RepJourneyRange } from '@/api/types/tracking';
import { Button } from '@/components/ui/button';
import {
  SearchableUserPicker,
  type ReportsFilterUserPickable,
} from '@/components/filters/searchable-filter-comboboxes';
import { cn } from '@/lib/utils';

const TRACE_RANGES: { range: RepJourneyRange; label: string }[] = [
  { range: 'hour', label: 'Hour' },
  { range: 'day', label: 'Day' },
  { range: 'week', label: 'Week' },
];

export interface RepTrackerControlProps {
  users: ReportsFilterUserPickable[];
  branches: BranchListItem[];
  selectedUid: string;
  onUidChange: (uid: string) => void;
  activeRange: RepJourneyRange | null;
  onTraceRange: (range: RepJourneyRange) => void;
  onClear: () => void;
  isTracing?: boolean;
  statusMessage?: string | null;
  className?: string;
}

/**
 * Searchable sales-rep picker + Hour/Day/Week chips for map journey tracking.
 */
export function RepTrackerControl({
  users,
  branches,
  selectedUid,
  onUidChange,
  activeRange,
  onTraceRange,
  onClear,
  isTracing = false,
  statusMessage = null,
  className,
}: RepTrackerControlProps) {
  const isTracking = selectedUid !== 'all';

  return (
    <div
      className={cn(
        'bg-background/95 w-full space-y-2 rounded-lg border p-3 shadow-sm backdrop-blur',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
          Track sales rep
        </p>
        {isTracking ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground shrink-0 text-[10px] underline disabled:opacity-50"
            disabled={isTracing}
            onClick={onClear}
          >
            Clear
          </button>
        ) : null}
      </div>
      <SearchableUserPicker
        users={users}
        branches={branches}
        selectedUid={selectedUid}
        onUidChange={onUidChange}
        triggerClassName="h-9 w-full sm:w-full"
        searchPlaceholder="Search sales reps…"
        allOptionLabel="All sales reps"
        emptyMessage="No sales rep found."
      />
      {isTracking ? (
        <div className="flex flex-wrap gap-1.5">
          {TRACE_RANGES.map(({ range, label }) => (
            <Button
              key={range}
              type="button"
              size="xs"
              variant={activeRange === range ? 'default' : 'outline'}
              disabled={isTracing}
              onClick={() => onTraceRange(range)}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : null}
      {isTracking && statusMessage ? (
        <p className="text-muted-foreground text-[11px] leading-snug">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
