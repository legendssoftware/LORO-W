'use client';

import { cn } from '@/lib/utils';

/** Segment state for 4-quarter progress. */
function getSegmentState(
  value: number,
  segmentIndex: number
): { state: 'empty' | 'partial' | 'full'; partialPercent?: number } {
  const clamped = Math.min(100, Math.max(0, value));
  const segmentStart = segmentIndex * 25;
  const segmentEnd = (segmentIndex + 1) * 25;
  if (clamped >= segmentEnd) return { state: 'full' };
  if (clamped <= segmentStart) return { state: 'empty' };
  const partialPercent = ((clamped - segmentStart) / 25) * 100;
  return { state: 'partial', partialPercent };
}

/** Progress tier colors: <70% red, ≥70% green (same rule for text and bar). */
export function getProgressColorClasses(value: number): { text: string; bg: string } {
  if (value >= 70) return { text: 'text-green-600', bg: 'bg-green-500' };
  return { text: 'text-red-600', bg: 'bg-red-500' };
}

const SEGMENT_COUNT = 4;
const TRACK = 'bg-muted';

/** Four-segment progress bar: quarters of total expected. Fill is red when <70%, green when ≥70%. */
export function ReportProgressBar({ value }: { value: number }) {
  const fillClass = getProgressColorClasses(value).bg;
  return (
    <div
      className="flex w-full gap-1.5 items-stretch"
      role="progressbar"
      aria-valuenow={Math.min(100, Math.max(0, value))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
        const { state, partialPercent } = getSegmentState(value, i);
        return (
          <div
            key={i}
            className={cn(
              'flex-1 h-2 rounded-full overflow-hidden min-w-0',
              state === 'empty' && TRACK,
              state === 'full' && fillClass,
              state === 'partial' && TRACK
            )}
          >
            {state === 'partial' && partialPercent != null && (
              <div
                className={cn('h-full rounded-full transition-all', fillClass)}
                style={{ width: `${partialPercent}%`, minWidth: partialPercent > 0 ? 2 : 0 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
