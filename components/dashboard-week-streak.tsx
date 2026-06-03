'use client';

import { getCurrentWeekDays } from '@/lib/attendance-streak';
import { format } from 'date-fns';

/**
 * Optional week strip: shows Mon–Sat labels and streak count from metrics.
 * Does not require per-day check-ins; uses metrics.attendanceStreak only.
 */
export function DashboardWeekStreak({ streak }: { streak?: number }) {
  const weekDays = getCurrentWeekDays();
  const value = streak ?? 0;
  return (
    <div className="rounded border border-border bg-muted/30 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 sm:gap-2">
          {weekDays.map((date) => (
            <span
              key={format(date, 'yyyy-MM-dd')}
              className="text-xs font-medium text-muted-foreground"
            >
              {format(date, 'EEE').substring(0, 2)}
            </span>
          ))}
        </div>
        <span className="text-sm font-semibold text-foreground">
          {value} day{value !== 1 ? 's' : ''} this week
        </span>
      </div>
    </div>
  );
}
