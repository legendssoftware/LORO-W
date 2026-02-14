'use client';

import { Card, CardContent } from '@/components/ui/card';
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
      <Card className="border-muted">
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">Loading metrics…</p>
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
