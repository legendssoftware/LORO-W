'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AttendanceMetrics } from '@/api/types';
import { TimerIcon } from '@/lib/icons';

/**
 * Total hours worked card with leave days accrued.
 * Matches APK attendance tab layout.
 */
export function DashboardMetricsCard({
  metrics,
  isLoading,
  leaveDaysAccrued,
}: {
  metrics: AttendanceMetrics | null | undefined;
  isLoading: boolean;
  leaveDaysAccrued?: number | null;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="px-4 pt-6 sm:px-6">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-3 gap-y-4 sm:grid-cols-4 sm:gap-4 md:gap-6 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="min-w-0 text-center">
                <Skeleton className="mx-auto h-8 w-12 rounded-md sm:h-9 sm:w-14" />
                <Skeleton className="mx-auto mt-1 h-3 w-14 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!metrics?.totalHours) return null;

  const { today, thisWeek, thisMonth, allTime } = metrics.totalHours;
  const hasLeave = leaveDaysAccrued != null;

  return (
    <Card>
      <CardContent className="px-4 pt-6 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <TimerIcon className="size-5 text-primary" aria-hidden />
          <span className="text-sm font-medium uppercase text-foreground">
            Total hours worked
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 gap-y-4 sm:grid-cols-4 sm:gap-4 md:gap-6 lg:grid-cols-5">
          <div className="min-w-0 text-center">
            <p className="text-xl font-semibold text-foreground sm:text-2xl">{today}h</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </div>
          <div className="min-w-0 text-center">
            <p className="text-xl font-semibold text-foreground sm:text-2xl">{thisWeek}h</p>
            <p className="text-xs text-muted-foreground">This week</p>
          </div>
          <div className="min-w-0 text-center">
            <p className="text-xl font-semibold text-foreground sm:text-2xl">{thisMonth}h</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
          <div className="min-w-0 text-center">
            <p className="text-xl font-semibold text-foreground sm:text-2xl">{allTime}h</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </div>
          {hasLeave && (
            <div className="min-w-0 text-center">
              <p className="text-xl font-semibold text-foreground sm:text-2xl">{leaveDaysAccrued}</p>
              <p className="text-xs text-muted-foreground">Leave days accrued</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
