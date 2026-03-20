'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AttendanceMetrics } from '@/api/types';
import { TimerIcon } from '@/lib/icons';

/** Current month name (e.g. "February"). */
function getCurrentMonthName(): string {
  return new Date().toLocaleString('default', { month: 'long' });
}

/** Payroll period label: "26 Jan to 25 Feb" (26th prev month to 25th current month). */
function getPayrollPeriodLabel(): string {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 26);
  const currMonth = new Date(now.getFullYear(), now.getMonth(), 25);
  const fmt = (d: Date) =>
    `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
  return `${fmt(prevMonth)} to ${fmt(currMonth)}`;
}

/**
 * Total hours worked card (Today, This week, Month name, Payroll period).
 * Matches APK attendance tab layout.
 */
export function DashboardMetricsCard({
  metrics,
  isLoading,
}: {
  metrics: AttendanceMetrics | null | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="px-4 pt-6 sm:px-6">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-3 gap-y-4 sm:grid-cols-4 sm:gap-4 md:gap-6 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
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

  const { today, thisWeek, thisMonth, payrollHours } = metrics.totalHours;
  const monthLabel = useMemo(() => getCurrentMonthName(), []);
  const payrollLabel = useMemo(() => getPayrollPeriodLabel(), []);

  return (
    <Card>
      <CardContent className="px-4 pt-6 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <TimerIcon className="size-5 text-primary" aria-hidden />
          <span className="text-sm font-medium uppercase text-foreground">
            Total hours worked
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 gap-y-4 sm:grid-cols-4 sm:gap-4 md:gap-6 lg:grid-cols-4">
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
            <div className="mt-1 flex flex-col items-center gap-0.5">
              <span className="text-xs font-medium text-muted-foreground">This Month</span>
              <span className="text-xs text-muted-foreground">{monthLabel}</span>
            </div>
          </div>
          <div className="min-w-0 text-center">
            <p className="text-xl font-semibold text-foreground sm:text-2xl">{payrollHours}h</p>
            <div className="mt-1 flex flex-col items-center gap-0.5">
              <span className="text-xs font-medium text-muted-foreground">Payroll Hours</span>
              <span className="text-xs leading-snug text-muted-foreground">{payrollLabel}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
