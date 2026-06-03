'use client';

import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useUserTarget, useProfileSales } from '@/api/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const startMonth = monthNames[start.getMonth()]!;
  const endMonth = monthNames[end.getMonth()]!;
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

function formatCurrencyZp(value: number, decimals = 2): string {
  return value.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function parsePersonalTargets(
  userTarget: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!userTarget) return null;
  const pt = userTarget.personalTargets;
  if (!isRecord(pt)) return null;
  return pt;
}

function toIsoDateField(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v.split('T')[0];
  if (v instanceof Date) return v.toISOString().split('T')[0];
  return undefined;
}

function getSalesTargetFromPt(pt: Record<string, unknown> | null): {
  target: number;
  current: number;
  currency: string;
  periodStartDate?: string;
  periodEndDate?: string;
} | null {
  if (!pt) return null;
  const sales = pt.sales;
  if (!isRecord(sales)) return null;
  const t = sales.target;
  const c = sales.current;
  const target = typeof t === 'number' ? t : Number(t);
  const current = typeof c === 'number' ? c : Number(c);
  if (!Number.isFinite(target) || target <= 0) return null;
  const currency = typeof sales.currency === 'string' ? sales.currency : 'ZAR';
  return {
    target,
    current: Number.isFinite(current) ? current : 0,
    currency,
    periodStartDate: toIsoDateField(pt.periodStartDate),
    periodEndDate: toIsoDateField(pt.periodEndDate),
  };
}

function getProgressColor(percentage: number, isOverTarget: boolean): string {
  if (isOverTarget) return '#10B981';
  if (percentage >= 80) return '#8B5CF6';
  if (percentage >= 60) return '#3B82F6';
  if (percentage >= 40) return '#F59E0B';
  return '#EF4444';
}

const REMAINING_COLOR = '#E5E7EB';

/** Mirrors APK TargetGoalCard + targets.tab sales row (semi-donut, achievement / remaining, status). */
export function DashboardTargetsRadial({
  userRef,
  className,
}: {
  userRef: string | null;
  className?: string;
}) {
  const targetQuery = useUserTarget(userRef, { enabled: !!userRef });

  const salesMeta = useMemo(() => {
    const raw = targetQuery.data?.userTarget;
    if (!raw || !isRecord(raw)) return null;
    const pt = parsePersonalTargets(raw);
    return getSalesTargetFromPt(pt);
  }, [targetQuery.data?.userTarget]);

  const hasSalesTarget = salesMeta != null;

  const profileSalesQuery = useProfileSales({
    enabled: !!userRef && hasSalesTarget,
  });

  const achieved = useMemo(() => {
    if (!salesMeta) return 0;
    const erp = profileSalesQuery.data;
    if (erp != null) return erp.totalRevenue ?? 0;
    return salesMeta.current;
  }, [salesMeta, profileSalesQuery.data]);

  const target = salesMeta?.target ?? 0;
  const currencyPrefix = salesMeta?.currency === 'ZAR' ? 'R' : (salesMeta?.currency ?? 'R');

  const percentage = target > 0 ? Math.min((achieved / target) * 100, 100) : 0;
  const isOverTarget = achieved > target;
  const progressColor = getProgressColor(percentage, isOverTarget);
  const remaining = Math.max(0, target - achieved);

  const periodLabel = useMemo(() => {
    const erp = profileSalesQuery.data;
    const start = erp?.periodStartDate ?? salesMeta?.periodStartDate;
    const end = erp?.periodEndDate ?? salesMeta?.periodEndDate;
    if (start && end) return formatDateRange(start, end);
    return null;
  }, [profileSalesQuery.data, salesMeta]);

  /** Same /erp/profile/sales payload: COUNT(DISTINCT doc_number) on tax invoices + credit notes (type I). */
  const erpSnapshot = profileSalesQuery.data;
  const erpLoading =
    hasSalesTarget && profileSalesQuery.isFetching && erpSnapshot === undefined;
  const erpInvoiceHeaders =
    erpSnapshot != null ? erpSnapshot.transactionCount : null;
  const erpUniqueCustomers =
    erpSnapshot != null ? erpSnapshot.uniqueCustomers : null;

  const pieData = useMemo(() => {
    if (target <= 0) return [];
    return [
      { name: 'achieved', value: achieved },
      { name: 'remaining', value: remaining > 0 ? remaining : 0 },
    ];
  }, [achieved, target, remaining]);

  function statusMessage(): string {
    if (isOverTarget) {
      return `🎉 Excellent! You've exceeded your target by ${(((achieved - target) / target) * 100).toFixed(0)}%`;
    }
    if (percentage >= 80) return '🚀 Almost there! Keep pushing to reach your goal';
    if (percentage >= 60) return '💪 Good progress! Continue the momentum';
    if (percentage >= 40) return "⚡ You're making progress, stay focused";
    return "📈 Let's get started on achieving this target";
  }

  if (!userRef) {
    return (
      <div
        className={cn(
          'flex min-h-[200px] flex-col justify-center rounded-lg border border-border bg-card p-4',
          className
        )}
      >
        <p className="text-sm text-muted-foreground">Sign in to see sales performance.</p>
      </div>
    );
  }

  if (targetQuery.isLoading) {
    return (
      <div
        className={cn(
          'flex flex-col gap-4 rounded-lg border border-border bg-card p-5',
          className
        )}
      >
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-4 w-full max-w-[200px] rounded-md" />
          <Skeleton className="h-3 w-48 rounded-md" />
        </div>
        <Skeleton className="mx-auto h-[180px] w-[240px] rounded-full" />
        <div className="flex gap-4 rounded-xl border border-gray-100 p-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
          <div className="flex-1 space-y-2 text-right">
            <Skeleton className="ml-auto h-3 w-20 rounded-md" />
            <Skeleton className="ml-auto h-7 w-32 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (targetQuery.isError) {
    return (
      <div
        className={cn(
          'flex min-h-[160px] flex-col justify-center rounded-lg border border-border bg-card p-4',
          className
        )}
      >
        <p className="text-sm text-destructive">Could not load targets. Try again later.</p>
      </div>
    );
  }

  if (!hasSalesTarget) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-border bg-card p-8',
          className
        )}
      >
        <p className="mb-3 text-5xl" aria-hidden>
          🎯
        </p>
        <p className="text-center text-sm font-medium text-foreground">No sales targets have been set for you yet</p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Contact your manager to set up your performance targets
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm',
        className
      )}
    >
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground">Sales Performance</h3>
        <p className="mt-1 text-sm text-muted-foreground">Track your performance towards goals</p>
        {periodLabel ? (
          <p className="mt-1 text-xs font-medium text-purple-600">{periodLabel}</p>
        ) : null}
      </div>

      <div className="flex justify-center py-2">
        <div className="h-[200px] w-full max-w-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="75%"
                startAngle={180}
                endAngle={0}
                innerRadius={70}
                outerRadius={95}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={progressColor} />
                <Cell fill={REMAINING_COLOR} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-2 flex flex-row items-center justify-between rounded-xl border border-gray-100 bg-background p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Achievement</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-2xl font-bold tabular-nums" style={{ color: progressColor }}>
              {percentage.toFixed(1)}%
            </span>
            {isOverTarget ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-950/50 dark:text-green-400">
                <TrendingUp className="size-3 shrink-0" aria-hidden />
                +{(((achieved - target) / target) * 100).toFixed(0)}%
              </span>
            ) : percentage < 100 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                <TrendingDown className="size-3 shrink-0" aria-hidden />
                {(100 - percentage).toFixed(0)}%
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {currencyPrefix}
            {formatCurrencyZp(achieved)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">{isOverTarget ? 'Exceeded' : 'Remaining'}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {currencyPrefix}
            {formatCurrencyZp(isOverTarget ? achieved - target : Math.abs(remaining), 2)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-xs">
        <div>
          <p className="text-muted-foreground">Invoice headers (ERP)</p>
          <p className="mt-0.5 font-semibold tabular-nums text-foreground">
            {erpLoading ? '…' : erpInvoiceHeaders != null ? erpInvoiceHeaders : '—'}
          </p>
          <p className="mt-1 leading-snug text-[10px] text-muted-foreground">
            Distinct tax invoice &amp; credit note documents in this period (same route as revenue).
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Customers (ERP)</p>
          <p className="mt-0.5 font-semibold tabular-nums text-foreground">
            {erpLoading ? '…' : erpUniqueCustomers != null ? erpUniqueCustomers : '—'}
          </p>
          <p className="mt-1 leading-snug text-[10px] text-muted-foreground">
            Unique customers on those lines. Requires ERP rep code on your profile.
          </p>
        </div>
      </div>

      <div
        className="mt-3 flex items-start gap-2 rounded-lg p-3 text-xs font-medium leading-snug"
        style={{
          backgroundColor: `${progressColor}15`,
          color: progressColor,
        }}
      >
        <span
          className="mt-1 size-2 shrink-0 rounded-full"
          style={{ backgroundColor: progressColor }}
          aria-hidden
        />
        <span>{statusMessage()}</span>
      </div>
    </div>
  );
}
