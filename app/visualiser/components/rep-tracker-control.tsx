'use client';

import type { BranchListItem } from '@/api/types/branch';
import type { RepJourneyRange, RepJourneySummary } from '@/api/types/tracking';
import { UtcDateRangePicker } from '@/components/filters/utc-date-range-picker';
import { Button } from '@/components/ui/button';
import {
  SearchableUserPicker,
  type ReportsFilterUserPickable,
} from '@/components/filters/searchable-filter-comboboxes';
import { TripBreakdownPanel } from '@/app/visualiser/components/trip-breakdown-panel';
import type { LastKnownLocationSummary } from '@/app/visualiser/lib/rep-tracker-types';
import type { JourneyVisitAction } from '@/app/visualiser/lib/journey-visit-actions';
import { cn } from '@/lib/utils';

export type { LastKnownLocationSummary };

const TRACE_RANGES: { range: RepJourneyRange; label: string }[] = [
  { range: 'hour', label: 'Hour' },
  { range: 'today', label: 'Today' },
  { range: 'day', label: 'Day' },
  { range: 'week', label: 'Week' },
  { range: 'custom', label: 'Custom' },
];

export interface RepTrackerControlProps {
  users: ReportsFilterUserPickable[];
  branches: BranchListItem[];
  selectedUid: string;
  onUidChange: (uid: string) => void;
  activeRange: RepJourneyRange | null;
  onTraceRange: (range: RepJourneyRange) => void;
  customRange?: { start: Date; end: Date } | null;
  onCustomRangeChange?: (range: { start: Date; end: Date }) => void;
  onResetCustomRange?: () => void;
  onClear: () => void;
  isTracing?: boolean;
  statusMessage?: string | null;
  /** Full journey summary when a route is loaded. */
  journeySummary?: RepJourneySummary | null;
  /** Human label for the active trace window (e.g. past day). */
  rangeLabel?: string | null;
  /** Live (or fallback) last-known location for the tracked rep. */
  lastKnownLocation?: LastKnownLocationSummary | null;
  onLastKnownClick?: () => void;
  /** Check-in / visit actions along the tracked trail. */
  visitActions?: JourneyVisitAction[];
  selectedVisitId?: number | null;
  onVisitActionClick?: (visit: JourneyVisitAction) => void;
  /** True when one or more rep routes are drawn on the map. */
  hasActiveTrail?: boolean;
  className?: string;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  isSearchLoading?: boolean;
}

/**
 * Searchable sales-rep picker + Hour/Today/Day/Week chips for map journey tracking.
 */
export function RepTrackerControl({
  users,
  branches,
  selectedUid,
  onUidChange,
  activeRange,
  onTraceRange,
  customRange = null,
  onCustomRangeChange,
  onResetCustomRange,
  onClear,
  isTracing = false,
  statusMessage = null,
  journeySummary = null,
  rangeLabel = null,
  lastKnownLocation = null,
  onLastKnownClick,
  visitActions = [],
  selectedVisitId = null,
  onVisitActionClick,
  hasActiveTrail = false,
  className,
  searchQuery,
  onSearchQueryChange,
  isSearchLoading = false,
}: RepTrackerControlProps) {
  const isSingleRep = selectedUid !== 'all';
  const showSummary = isSingleRep && journeySummary != null;
  const showClear = isSingleRep || hasActiveTrail || activeRange != null;

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
        {showClear ? (
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
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        isSearchLoading={isSearchLoading}
      />
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

      {activeRange === 'custom' && customRange && onCustomRangeChange ? (
        <UtcDateRangePicker
          startDate={customRange.start}
          endDate={customRange.end}
          onRangeChange={onCustomRangeChange}
          onReset={onResetCustomRange}
          compact
          disabled={isTracing}
        />
      ) : null}

      {showSummary ? (
        <TripBreakdownPanel
          journeySummary={journeySummary}
          rangeLabel={rangeLabel}
          lastKnownLocation={lastKnownLocation}
          onLastKnownClick={onLastKnownClick}
          visitActions={visitActions}
          selectedVisitId={selectedVisitId}
          onVisitActionClick={onVisitActionClick}
          statusMessage={statusMessage}
        />
      ) : statusMessage ? (
        <p className="text-muted-foreground text-[11px] leading-snug">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
