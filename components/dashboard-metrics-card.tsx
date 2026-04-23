'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AttendanceMetrics } from '@/api/types';
import { useUserTarget, useProfileSales } from '@/api/hooks';
import {
  canFetchProfileSales,
  hasSalesTargetForProfileSales,
} from '@/lib/dashboard-profile-sales-gate';
import { TimerIcon } from '@/lib/icons';
import { MapPinIcon } from 'lucide-react';
import { DashboardTargetsRadial } from '@/components/dashboard-targets-radial';
import { formatPayrollPeriodLabel } from '@/lib/payroll-period';
import { isAdminAccessLevel } from '@/lib/access';
import { userHasPerformanceTarget } from '@/app/reports/utils/user-has-performance-target';
import { cn } from '@/lib/utils';

/** Current month name (e.g. "February"). */
function getCurrentMonthName(): string {
  return new Date().toLocaleString('default', { month: 'long' });
}

/**
 * Total hours worked card (Today, This week, Month name, Payroll period).
 * Matches APK attendance tab layout.
 */
export function DashboardMetricsCard({
  metrics,
  isLoading,
  userRef,
  accessLevel,
}: {
  metrics: AttendanceMetrics | null | undefined;
  isLoading: boolean;
  userRef: string | null;
  /** When Admin and user has no personal sales target, CRM targets column is hidden. */
  accessLevel?: string | null;
}) {
  const monthLabel = useMemo(() => getCurrentMonthName(), []);
  const payrollLabel = formatPayrollPeriodLabel(new Date());
  const adminNoTargetsCrmSkeleton = isAdminAccessLevel(accessLevel ?? undefined);

  const targetQuery = useUserTarget(userRef, { enabled: !!userRef });
  const shouldFetchProfileSales = useMemo(() => {
    const ut = targetQuery.data?.userTarget ?? null;
    return hasSalesTargetForProfileSales(ut) || canFetchProfileSales(ut);
  }, [targetQuery.data?.userTarget]);
  const profileSalesQuery = useProfileSales({
    enabled: !!userRef && shouldFetchProfileSales,
  });

  const ut = targetQuery.data?.userTarget ?? null;
  const hasCrmTargets =
    userHasPerformanceTarget(ut as Record<string, unknown> | null) ||
    hasSalesTargetForProfileSales(ut);
  const showCrmVisitsSection =
    !!userRef && targetQuery.isSuccess && !targetQuery.isError && hasCrmTargets;
  const showCrmSkeletonBlock =
    !!userRef &&
    (targetQuery.isLoading || targetQuery.isPending
      ? true
      : targetQuery.isSuccess
        ? hasCrmTargets
        : false);

  if (isLoading) {
    return (
      <Card data-tour="total-hours-worked-section">
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
          {showCrmSkeletonBlock ? (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="mb-4 flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-4 w-48 rounded-md" />
              </div>
              <div
                className={cn(
                  'grid grid-cols-1 gap-4',
                  !adminNoTargetsCrmSkeleton && 'sm:grid-cols-2'
                )}
              >
                <div className="space-y-3 rounded-lg border border-gray-200 p-4">
                  <Skeleton className="h-3 w-32 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                </div>
                {adminNoTargetsCrmSkeleton ? null : (
                  <div className="min-h-[220px] rounded-lg border border-gray-200 p-4">
                    <Skeleton className="h-3 w-24 rounded-md" />
                    <Skeleton className="mx-auto mt-6 h-[160px] w-[200px] rounded-full" />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }
  if (!metrics?.totalHours) return null;

  const { today, thisWeek, thisMonth, payrollHours } = metrics.totalHours;

  const calendarInvoiceCount = metrics.productivity?.erpTaxInvoices.thisMonth.invoiceCount;
  const profileInvoiceHeaders = profileSalesQuery.data?.transactionCount;
  const taxInvoiceDisplay = (() => {
    if (calendarInvoiceCount != null) return String(calendarInvoiceCount);
    if (
      shouldFetchProfileSales &&
      profileSalesQuery.isFetching &&
      profileSalesQuery.data === undefined &&
      !profileSalesQuery.isError
    ) {
      return '…';
    }
    if (profileInvoiceHeaders != null) return String(profileInvoiceHeaders);
    return '—';
  })();
  const taxInvoiceHint =
    calendarInvoiceCount == null && profileInvoiceHeaders != null
      ? 'Calendar-month count (attendance metrics) was unavailable. This number is distinct tax invoice and credit note document numbers for your sales target period — same source as GET /erp/profile/sales (COUNT(DISTINCT doc_number) on sales lines).'
      : calendarInvoiceCount != null &&
          profileInvoiceHeaders != null &&
          profileInvoiceHeaders !== calendarInvoiceCount
        ? `Your sales target period has ${profileInvoiceHeaders} distinct invoice/credit headers (may differ from calendar month).`
        : null;

  const hideAdminTargetsColumn =
    isAdminAccessLevel(accessLevel ?? undefined) &&
    !targetQuery.isLoading &&
    !targetQuery.isError &&
    !hasSalesTargetForProfileSales(targetQuery.data?.userTarget ?? null);

  return (
    <Card data-tour="total-hours-worked-section">
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

        {metrics.productivity && showCrmVisitsSection ? (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="mb-4 flex items-center gap-2">
              <MapPinIcon className="size-5 text-primary" aria-hidden />
              <span className="text-sm font-medium uppercase text-foreground">
                CRM visits &amp; invoices (ERP)
              </span>
            </div>
            <div
              className={cn(
                'grid grid-cols-1 gap-4',
                !hideAdminTargetsColumn && 'sm:grid-cols-2'
              )}
            >
              <div className="rounded-lg border border-gray-200 bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">This month · {monthLabel}</p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Completed visits</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {metrics.productivity.visits.thisMonth.completedVisitCount}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Visit hours (total)</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {metrics.productivity.visits.thisMonth.totalVisitHours}h
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Avg / visit</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {metrics.productivity.visits.thisMonth.averageVisitHours}h
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Tax invoices (ERP)</dt>
                    <dd className="font-medium tabular-nums text-foreground">{taxInvoiceDisplay}</dd>
                  </div>
                  {taxInvoiceHint ? (
                    <p className="-mt-0.5 text-[10px] leading-snug text-muted-foreground">{taxInvoiceHint}</p>
                  ) : null}
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Utilization (net / worked)</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {metrics.productivity.net.thisMonth.productivityUtilizationPct}%
                    </dd>
                  </div>
                </dl>
              </div>
              {hideAdminTargetsColumn ? null : <DashboardTargetsRadial userRef={userRef} />}
            </div>
            <p className="mt-4 text-xs leading-snug text-muted-foreground">
              Adm &amp; invoicing time is not deducted from visit hours until tracked. Calendar-month tax invoice counts
              come from attendance metrics (doc_type = 1, your rep code). When that is unavailable but your target
              period and rep code are set, the dashboard uses GET /erp/profile/sales (distinct invoice and credit note
              document numbers for that period). &quot;—&quot; means neither source returned a value.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
