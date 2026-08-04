'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import {
  classifyRepGpsFreshness,
  formatRelativeRecordedAt,
  type RepGpsFreshness,
} from '@/lib/utils/journey-point-format';
import type { VisualiserMapPoint } from '@/lib/utils/visualiser-map-points';
import { cn } from '@/lib/utils';

type PlottedSalesRepsListProps = {
  reps: VisualiserMapPoint[];
  selectedRepUid?: number | null;
  onRepClick: (point: VisualiserMapPoint) => void;
  isLayerVisible?: boolean;
  className?: string;
};

function freshnessSortRank(freshness: RepGpsFreshness): number {
  switch (freshness) {
    case 'live':
      return 0;
    case 'stale':
      return 1;
    case 'unknown':
      return 2;
    default: {
      const _exhaustive: never = freshness;
      return _exhaustive;
    }
  }
}

function recordedAtMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const d = new Date(iso);
  const ms = d.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function sortPlottedReps(reps: VisualiserMapPoint[]): VisualiserMapPoint[] {
  return [...reps].sort((a, b) => {
    const aFresh = classifyRepGpsFreshness(a.recordedAt);
    const bFresh = classifyRepGpsFreshness(b.recordedAt);
    const rankDiff = freshnessSortRank(aFresh) - freshnessSortRank(bFresh);
    if (rankDiff !== 0) return rankDiff;
    return recordedAtMs(b.recordedAt) - recordedAtMs(a.recordedAt);
  });
}

function FreshnessBadge({ freshness }: { freshness: RepGpsFreshness }) {
  if (freshness === 'unknown') return null;
  const isLive = freshness === 'live';
  return (
    <span
      className={cn(
        'shrink-0 rounded px-1 py-0.5 text-[9px] font-medium tracking-wide uppercase',
        isLive
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
      )}
    >
      {isLive ? 'Live' : 'Stale'}
    </span>
  );
}

/**
 * Scrollable list of sales reps currently plotted on the map (within GPS window).
 */
export function PlottedSalesRepsList({
  reps,
  selectedRepUid = null,
  onRepClick,
  isLayerVisible = true,
  className,
}: PlottedSalesRepsListProps) {
  const sortedReps = useMemo(() => sortPlottedReps(reps), [reps]);

  if (sortedReps.length === 0) {
    return (
      <p className={cn('text-muted-foreground px-1 py-1 text-[11px]', className)}>
        No GPS in the last 8 hours
      </p>
    );
  }

  return (
    <ul className={cn('max-h-40 space-y-1 overflow-y-auto', className)}>
      {sortedReps.map((rep) => {
        const freshness = classifyRepGpsFreshness(rep.recordedAt);
        const relative = formatRelativeRecordedAt(rep.recordedAt);
        const isSelected = rep.repUid != null && rep.repUid === selectedRepUid;

        return (
          <li key={rep.id}>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors',
                isSelected
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : 'border-border/40 bg-background/40 hover:border-border hover:bg-muted/40',
                !isLayerVisible && 'opacity-70'
              )}
              onClick={() => onRepClick(rep)}
            >
              {rep.logoUrl ? (
                <span className="relative size-7 shrink-0 overflow-hidden rounded-full border border-border/60">
                  <Image
                    src={rep.logoUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </span>
              ) : (
                <span
                  className="size-7 shrink-0 rounded-full border-2 border-white bg-violet-600 shadow-sm ring-1 ring-violet-300/80"
                  aria-hidden
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-foreground truncate text-[11px] font-medium">
                    {rep.name}
                  </span>
                  <FreshnessBadge freshness={freshness} />
                </span>
                <span className="text-muted-foreground mt-0.5 block truncate text-[10px] tabular-nums">
                  {relative ?? 'Last seen unknown'}
                  {!isLayerVisible ? ' · hidden on map' : null}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function countLivePlottedReps(reps: VisualiserMapPoint[]): number {
  return reps.filter(
    (rep) => classifyRepGpsFreshness(rep.recordedAt) === 'live'
  ).length;
}
