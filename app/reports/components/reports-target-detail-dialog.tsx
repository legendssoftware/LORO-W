'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import {
  useApiClient,
  useCheckIns,
  useDailyProductivity,
  useLeads,
  useLeadsReport,
  useUserTarget,
} from '@/api/hooks';
import {
  getUserSales,
  profileSalesFromResponse,
} from '@/api/endpoints/erp-user-sales';
import {
  getUserCommissionsByCategory,
  getUserProductCommissions,
} from '@/api/endpoints/erp-user-commissions';
import {
  ReportProgressBar,
  getProgressColorClasses,
} from '@/app/staff/components/report-progress-bar';
import type {
  ReportsTargetMetricCell,
  ReportsTargetRow,
} from '@/app/reports/lib/reports-target-row';
import {
  applyErpSalesToRow,
  enrichRowWithTargetDashboard,
} from '@/app/reports/lib/reports-target-row';
import {
  applyCurrencyViewToRow,
  type ExchangeRateMap,
  type ReportsTargetsCurrencyView,
} from '@/app/reports/lib/reports-target-currency';
import {
  aggregateLeadActions,
  aggregateLeadDurations,
  aggregateVisits,
  formatVisitDurationTotal,
  seriesFromByStatus,
  weeklyTrendFromProductivity,
} from '@/app/reports/lib/reports-target-detail-aggregates';
import {
  formatReportCurrencyCode,
  getReportsCategoryAxisLayout,
  REPORTS_CHART_MARGIN,
  reportsYAxisLabelProps,
} from '@/app/reports/lib/reports-chart-format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DialogCloseButton } from '@/components/dialog-close-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ATT_CHART_HSL } from '@/lib/chart-colors';
import {
  getTargetWarningHistory,
  summarizeTargetWarnings,
} from '@/lib/target-warnings-summary';
import { formatWarningDateTime } from '@/lib/format-warning-datetime';
import { humanizeReportLabel } from '@/lib/utils/report-labels';
import { cn } from '@/lib/utils';

const WARNING_BADGE: Record<1 | 2 | 3, string> = {
  1: 'bg-green-100 text-green-800 border-green-200/80',
  2: 'bg-amber-100 text-amber-900 border-amber-200/80',
  3: 'bg-red-100 text-red-800 border-red-200/80',
};

const BAR_PALETTE = [
  ATT_CHART_HSL.c1,
  ATT_CHART_HSL.c2,
  ATT_CHART_HSL.c3,
  ATT_CHART_HSL.c4,
  ATT_CHART_HSL.c5,
] as const;

const PRODUCT_TOP_N = 5;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString();
}

function formatMoney(value: number, currency = 'R'): string {
  const code = formatReportCurrencyCode(currency);
  if (!Number.isFinite(value)) return `${code} 0`;
  return `${code} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatSales(cell: ReportsTargetMetricCell): string {
  const currency = formatReportCurrencyCode(cell.currency);
  const cur = cell.current.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const tgt = cell.target.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return `${currency} ${cur} / ${tgt}`;
}

function toYmd(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function ModalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="border-b border-border pb-1.5 text-sm font-semibold text-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetricDetail({
  label,
  cell,
  formatValue,
  done = false,
}: {
  label: string;
  cell: ReportsTargetMetricCell;
  formatValue: (cell: ReportsTargetMetricCell) => string;
  done?: boolean;
}) {
  const displayProgress = done ? 100 : cell.progress;
  const colors = getProgressColorClasses(displayProgress);
  return (
    <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn('text-xs font-semibold tabular-nums', colors.text)}>
          {cell.target > 0 ? (done ? 'Done' : `${displayProgress}%`) : '—'}
        </span>
      </div>
      <p className="text-sm font-medium tabular-nums text-foreground">{formatValue(cell)}</p>
      <ReportProgressBar value={displayProgress} />
    </div>
  );
}

function EmptyChartNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function NamedBarChart({
  title,
  data,
  valueKey = 'value',
  height = 220,
  yAxisLabel = 'Count',
}: {
  title: string;
  data: Array<{ name: string; value: number }>;
  valueKey?: string;
  height?: number;
  yAxisLabel?: string;
}) {
  const config: ChartConfig = {
    [valueKey]: { label: yAxisLabel, color: ATT_CHART_HSL.c2 },
  };
  if (data.length === 0) {
    return (
      <section className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
        <EmptyChartNote>No data for this range.</EmptyChartNote>
      </section>
    );
  }
  const labels = data.map((row) => humanizeReportLabel(row.name));
  const xLayout = getReportsCategoryAxisLayout(labels);
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        <BarChart data={data} margin={REPORTS_CHART_MARGIN}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={14}
            interval={0}
            angle={xLayout.angle}
            textAnchor={xLayout.textAnchor}
            height={xLayout.height}
            tickFormatter={(v) => humanizeReportLabel(String(v))}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tickMargin={12}
            allowDecimals={false}
            label={reportsYAxisLabelProps(yAxisLabel)}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend
            verticalAlign="bottom"
            wrapperStyle={{ paddingTop: 16 }}
            content={<ChartLegendContent className="gap-5 pt-5" />}
          />
          <Bar dataKey={valueKey} radius={4}>
            {data.map((row, i) => (
              <Cell key={row.name} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </section>
  );
}

export interface ReportsTargetDetailDialogProps {
  row: ReportsTargetRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Toolbar date range for calls/leads review strip. Null when all-time. */
  reviewStartYmd: string | null;
  reviewEndYmd: string | null;
  currencyView?: ReportsTargetsCurrencyView;
  exchangeRateMap?: ExchangeRateMap;
}

export function ReportsTargetDetailDialog({
  row,
  open,
  onOpenChange,
  reviewStartYmd,
  reviewEndYmd,
  currencyView = 'set',
  exchangeRateMap,
}: ReportsTargetDetailDialogProps) {
  const client = useApiClient();
  const targetQuery = useUserTarget(row?.ref ?? null, {
    enabled: open && !!row?.ref,
  });

  const reportFrom =
    reviewStartYmd ?? toYmd(row?.periodStartDate) ?? null;
  const reportTo = reviewEndYmd ?? toYmd(row?.periodEndDate) ?? null;
  const hasReportRange = !!reportFrom && !!reportTo;

  const erpSalesQuery = useQuery({
    queryKey: ['erp', 'user-sales', row?.userId] as const,
    queryFn: async (): Promise<number | null> => {
      if (row?.userId == null) return null;
      try {
        const res = await getUserSales(client, row.userId);
        return profileSalesFromResponse(res)?.totalRevenue ?? null;
      } catch {
        return null;
      }
    },
    enabled: open && !!row?.userId && (row?.sales.target ?? 0) > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const commissionsCategoryQuery = useQuery({
    queryKey: ['erp', 'user-commissions-by-category', row?.userId] as const,
    queryFn: async () => {
      if (row?.userId == null) return [];
      const res = await getUserCommissionsByCategory(client, row.userId);
      return res.success ? res.data ?? [] : [];
    },
    enabled: open && !!row?.userId && (row?.sales.target ?? 0) > 0,
    staleTime: 2 * 60 * 1000,
  });

  const productCommissionsQuery = useQuery({
    queryKey: ['erp', 'user-commissions', row?.userId] as const,
    queryFn: async () => {
      if (row?.userId == null) return [];
      const res = await getUserProductCommissions(client, row.userId);
      return res.success ? res.data ?? [] : [];
    },
    enabled: open && !!row?.userId && (row?.sales.target ?? 0) > 0,
    staleTime: 2 * 60 * 1000,
  });

  const visitsQuery = useCheckIns(
    {
      userUid: row?.ref,
      startDate: reportFrom ?? undefined,
      endDate: reportTo ?? undefined,
    },
    { enabled: open && !!row?.ref && hasReportRange }
  );

  const leadsReportQuery = useLeadsReport(
    {
      from: reportFrom ?? '',
      to: reportTo ?? '',
      ownerId: row?.userId,
      dateBasis: 'activity',
    },
    { enabled: open && !!row?.userId && hasReportRange }
  );

  const leadsListQuery = useLeads(
    {
      ownerId: row?.userId,
      startDate: reportFrom ?? undefined,
      endDate: reportTo ?? undefined,
      scope: 'all',
      limit: 200,
      page: 1,
    },
    { enabled: open && !!row?.userId && hasReportRange }
  );

  const displayRow = useMemo(() => {
    if (!row) return null;
    const enriched = targetQuery.data?.userTarget
      ? enrichRowWithTargetDashboard(row, targetQuery.data.userTarget)
      : row;
    const withSales = applyErpSalesToRow(
      {
        ...enriched,
        calls: row.calls,
        leads: row.leads,
        hours: row.hours,
        engagementMet: row.engagementMet,
        periodLabel: row.periodLabel,
        setCurrency: row.setCurrency ?? enriched.setCurrency,
        branchCountryCode: row.branchCountryCode ?? enriched.branchCountryCode,
        erpCurrency: row.erpCurrency ?? enriched.erpCurrency,
      },
      erpSalesQuery.data ?? row.sales.current
    );
    const merged = {
      ...withSales,
      calls: row.calls,
      leads: row.leads,
      hours: row.hours,
      engagementMet: row.engagementMet,
      periodLabel: row.periodLabel,
    };
    return applyCurrencyViewToRow(
      merged,
      currencyView,
      exchangeRateMap ?? new Map()
    );
  }, [
    row,
    targetQuery.data?.userTarget,
    erpSalesQuery.data,
    currencyView,
    exchangeRateMap,
  ]);

  const hasReviewRange = !!reviewStartYmd && !!reviewEndYmd;
  const productivityQuery = useDailyProductivity(
    row?.ref ?? null,
    reportFrom,
    reportTo,
    { enabled: open && !!row?.ref && hasReportRange }
  );

  const warnings = displayRow?.targetWarnings ?? null;
  const summary = summarizeTargetWarnings(warnings);
  const history = getTargetWarningHistory(warnings);

  const reviewDays = productivityQuery.data?.days ?? [];
  const reviewAvg = (() => {
    const scored = reviewDays.filter((d) => d.score != null);
    if (scored.length === 0) return null;
    const sum = scored.reduce((acc, d) => acc + (d.score ?? 0), 0);
    return Math.round(sum / scored.length);
  })();
  const reviewCallsAvg = (() => {
    const vals = reviewDays
      .map((d) => d.components?.callsPct)
      .filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  })();
  const reviewLeadsAvg = (() => {
    const vals = reviewDays
      .map((d) => d.components?.leadsPct)
      .filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  })();

  const visitAgg = useMemo(
    () => aggregateVisits(visitsQuery.data?.checkIns ?? []),
    [visitsQuery.data?.checkIns]
  );

  const weeklyTrend = useMemo(
    () => weeklyTrendFromProductivity(reviewDays),
    [reviewDays]
  );

  const leadActions = useMemo(
    () => aggregateLeadActions(leadsListQuery.data?.data ?? []),
    [leadsListQuery.data?.data]
  );

  const leadDurations = useMemo(
    () => aggregateLeadDurations(leadsListQuery.data?.data ?? []),
    [leadsListQuery.data?.data]
  );

  const leadStages = useMemo(
    () => seriesFromByStatus(leadsReportQuery.data?.byStatus),
    [leadsReportQuery.data?.byStatus]
  );

  const leadRegions = useMemo(
    () => seriesFromByStatus(leadsReportQuery.data?.byRegion),
    [leadsReportQuery.data?.byRegion]
  );

  const commissionBars = useMemo(
    () =>
      (commissionsCategoryQuery.data ?? []).map((row) => ({
        name: row.name,
        value: Math.round(row.totalCommission),
        sales: Math.round(row.totalSales),
      })),
    [commissionsCategoryQuery.data]
  );

  const productsSorted = productCommissionsQuery.data ?? [];
  const mostSold = productsSorted.slice(0, PRODUCT_TOP_N);
  const leastSold =
    productsSorted.length > PRODUCT_TOP_N
      ? [...productsSorted].reverse().slice(0, PRODUCT_TOP_N)
      : productsSorted.length > 1
        ? [...productsSorted].reverse().slice(0, Math.min(PRODUCT_TOP_N, productsSorted.length))
        : [];

  const totalCommission = useMemo(
    () =>
      (commissionsCategoryQuery.data ?? []).reduce(
        (sum, r) => sum + (Number.isFinite(r.totalCommission) ? r.totalCommission : 0),
        0
      ),
    [commissionsCategoryQuery.data]
  );

  const trendConfig: ChartConfig = {
    score: { label: 'Avg score', color: ATT_CHART_HSL.c1 },
    callsPct: { label: 'Calls %', color: ATT_CHART_HSL.c2 },
    leadsPct: { label: 'Leads %', color: ATT_CHART_HSL.c4 },
  };

  const currency = formatReportCurrencyCode(displayRow?.sales.currency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] w-[80vw] max-w-[80vw] flex-col overflow-hidden p-4 pt-12 pr-14 sm:max-w-[80vw] sm:p-6"
        data-tour="reports-target-detail-dialog"
      >
        <div className="absolute top-4 right-4 z-10">
          <DialogCloseButton />
        </div>
        <DialogHeader className="shrink-0">
          <DialogTitle>{displayRow ? displayRow.name : 'Target details'}</DialogTitle>
          <DialogDescription>
            Per-user performance report
            {displayRow?.periodLabel ? ` · ${displayRow.periodLabel}` : ''}.
          </DialogDescription>
        </DialogHeader>

        {displayRow ? (
          <div className="-mx-1 min-h-0 flex-1 space-y-6 overflow-y-auto px-1 pt-2">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 shrink-0">
                <AvatarImage src={displayRow.photoURL ?? undefined} alt="" />
                <AvatarFallback>{initials(displayRow.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">
                  {displayRow.name}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {displayRow.branch ?? displayRow.email}
                </p>
                {displayRow.periodLabel ? (
                  <p className="text-xs text-muted-foreground/80">{displayRow.periodLabel}</p>
                ) : null}
              </div>
              {summary.currentLevel === 1 ||
              summary.currentLevel === 2 ||
              summary.currentLevel === 3 ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'ml-auto gap-1 shrink-0 text-[10px] font-medium',
                    WARNING_BADGE[summary.currentLevel]
                  )}
                >
                  <AlertTriangle className="size-3" />
                  Level {summary.currentLevel}
                </Badge>
              ) : null}
            </div>

            {targetQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              <ModalSection title="Sales">
                <MetricDetail
                  label="Sales amount"
                  cell={displayRow.sales}
                  formatValue={formatSales}
                />
              </ModalSection>

              <ModalSection title="Calls & leads">
                <div className="grid gap-2 sm:grid-cols-2">
                  <MetricDetail
                    label="Calls"
                    cell={displayRow.calls}
                    done={displayRow.engagementMet && displayRow.calls.target > 0}
                    formatValue={(c) =>
                      `${formatCount(c.current)} / ${formatCount(c.target)}`
                    }
                  />
                  <MetricDetail
                    label="Leads"
                    cell={displayRow.leads}
                    done={displayRow.engagementMet && displayRow.leads.target > 0}
                    formatValue={(c) =>
                      `${formatCount(c.current)} / ${formatCount(c.target)}`
                    }
                  />
                </div>
                {hasReviewRange ? (
                  <div className="mt-2 space-y-1.5 rounded-lg border border-border/60 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Review · {reviewStartYmd}
                      {reviewEndYmd !== reviewStartYmd ? ` – ${reviewEndYmd}` : ''}
                    </p>
                    {productivityQuery.isLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Avg score</p>
                          <p className="text-sm font-semibold tabular-nums">
                            {reviewAvg != null ? `${reviewAvg}%` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Calls</p>
                          <p className="text-sm font-semibold tabular-nums">
                            {reviewCallsAvg != null ? `${reviewCallsAvg}%` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Leads</p>
                          <p className="text-sm font-semibold tabular-nums">
                            {reviewLeadsAvg != null ? `${reviewLeadsAvg}%` : '—'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </ModalSection>

              <ModalSection title="Hours">
                <MetricDetail
                  label="Attendance hours"
                  cell={displayRow.hours}
                  formatValue={(c) =>
                    `${formatCount(c.current)}h / ${formatCount(c.target)}h`
                  }
                />
              </ModalSection>
            </div>

            {!hasReportRange ? (
              <p className="text-sm text-muted-foreground">
                Select a date range in the toolbar to load visits, leads, and weekly trends.
              </p>
            ) : (
              <>
                <ModalSection title="Weekly trend">
                  {productivityQuery.isLoading ? (
                    <Skeleton className="h-[240px] w-full" />
                  ) : weeklyTrend.length === 0 ? (
                    <EmptyChartNote>No productivity samples in this range.</EmptyChartNote>
                  ) : (
                    <ChartContainer
                      config={trendConfig}
                      className="aspect-auto h-[260px] w-full"
                    >
                      <LineChart data={weeklyTrend} margin={{ left: 8, right: 8, top: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={64}
                          tickMargin={12}
                          domain={[0, 100]}
                          label={reportsYAxisLabelProps('Percent')}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend
                          verticalAlign="bottom"
                          wrapperStyle={{ paddingTop: 16 }}
                          content={<ChartLegendContent className="gap-5 pt-5" />}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="var(--color-score)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="callsPct"
                          stroke="var(--color-callsPct)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="leadsPct"
                          stroke="var(--color-leadsPct)"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ChartContainer>
                  )}
                </ModalSection>

                <ModalSection title="Visits">
                  <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>
                      Total:{' '}
                      <span className="font-medium text-foreground">{visitAgg.total}</span>
                    </span>
                    <span>
                      Time on visits:{' '}
                      <span className="font-medium text-foreground">
                        {formatVisitDurationTotal(visitAgg.totalMinutes)}
                      </span>
                    </span>
                  </div>
                  {visitsQuery.isLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-3">
                      <NamedBarChart title="By region" data={visitAgg.byRegion} />
                      <NamedBarChart title="By type" data={visitAgg.byType} />
                      <NamedBarChart
                        title="By duration"
                        data={visitAgg.byDuration.map((d) => ({
                          name: d.name,
                          value: d.count,
                        }))}
                      />
                    </div>
                  )}
                </ModalSection>

                <ModalSection title="Leads">
                  <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>
                      Total:{' '}
                      <span className="font-medium text-foreground">
                        {leadsReportQuery.data?.total ?? leadsListQuery.data?.data?.length ?? 0}
                      </span>
                    </span>
                    {leadsReportQuery.data?.totalEstimatedValue != null ? (
                      <span>
                        Pipeline value:{' '}
                        <span className="font-medium text-foreground">
                          {formatMoney(leadsReportQuery.data.totalEstimatedValue, currency)}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  {leadsReportQuery.isLoading || leadsListQuery.isLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                      <NamedBarChart title="Result stage" data={leadStages} />
                      <NamedBarChart title="Lead actions" data={leadActions} />
                      <NamedBarChart
                        title="Lead duration (created → activity)"
                        data={leadDurations.map((d) => ({
                          name: d.name,
                          value: d.count,
                        }))}
                      />
                      <NamedBarChart title="Leads by region" data={leadRegions} />
                    </div>
                  )}
                </ModalSection>
              </>
            )}

            <ModalSection title="Financials & products">
              <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>
                  Sales:{' '}
                  <span className="font-medium text-foreground">
                    {formatMoney(displayRow.sales.current, currency)}
                  </span>
                </span>
                <span>
                  Est. commission:{' '}
                  <span className="font-medium text-foreground">
                    {formatMoney(totalCommission, currency)}
                  </span>
                </span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {commissionsCategoryQuery.isLoading ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : (
                  <NamedBarChart
                    title="Commission by group"
                    data={commissionBars.map((r) => ({
                      name: r.name,
                      value: r.value,
                    }))}
                  />
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">
                      Most sold products
                    </h4>
                    {productCommissionsQuery.isLoading ? (
                      <Skeleton className="h-32 w-full" />
                    ) : mostSold.length === 0 ? (
                      <EmptyChartNote>No product sales in target period.</EmptyChartNote>
                    ) : (
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Units</TableHead>
                              <TableHead className="text-right">Sales</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mostSold.map((p) => (
                              <TableRow key={`most-${p.itemCode}`}>
                                <TableCell className="max-w-[10rem] truncate font-medium">
                                  {p.itemName || p.itemCode}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatCount(p.unitsSold)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatMoney(p.totalSales, currency)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">
                      Least sold products
                    </h4>
                    {productCommissionsQuery.isLoading ? (
                      <Skeleton className="h-32 w-full" />
                    ) : leastSold.length === 0 ? (
                      <EmptyChartNote>Not enough product variety to rank.</EmptyChartNote>
                    ) : (
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Units</TableHead>
                              <TableHead className="text-right">Sales</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leastSold.map((p) => (
                              <TableRow key={`least-${p.itemCode}`}>
                                <TableCell className="max-w-[10rem] truncate font-medium">
                                  {p.itemName || p.itemCode}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatCount(p.unitsSold)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatMoney(p.totalSales, currency)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ModalSection>

            <ModalSection title="Warnings history">
              <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>
                  Issued:{' '}
                  <span className="font-medium text-foreground">{summary.totalIssued}</span>
                </span>
                <span>
                  Acknowledged:{' '}
                  <span className="font-medium text-foreground">
                    {summary.totalAcknowledged}
                  </span>
                </span>
                <span>
                  Pending:{' '}
                  <span
                    className={cn(
                      'font-medium',
                      summary.pendingCount > 0 ? 'text-amber-700' : 'text-foreground'
                    )}
                  >
                    {summary.pendingCount}
                  </span>
                </span>
              </div>
              <Separator />
              {history.length === 0 ? (
                <p className="pt-2 text-sm text-muted-foreground">No warning history.</p>
              ) : (
                <ul className="grid gap-2 pt-2 sm:grid-cols-2">
                  {[...history].reverse().map((entry, i) => (
                    <li
                      key={`${entry.level}-${entry.issuedAt}-${i}`}
                      className="rounded-lg border border-border/60 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'gap-1 text-[10px] font-medium',
                            WARNING_BADGE[entry.level]
                          )}
                        >
                          <AlertTriangle className="size-3" />
                          Level {entry.level}
                        </Badge>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {entry.source.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Issued {formatWarningDateTime(entry.issuedAt)}
                      </p>
                      <p
                        className={cn(
                          'text-xs',
                          entry.acknowledgedAt
                            ? 'text-muted-foreground'
                            : 'font-medium text-amber-700'
                        )}
                      >
                        {entry.acknowledgedAt
                          ? `Acknowledged ${formatWarningDateTime(entry.acknowledgedAt)}`
                          : 'Still pending · Needs attention'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </ModalSection>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
