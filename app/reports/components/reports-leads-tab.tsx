'use client';

import { useMemo, useState, type ComponentType } from 'react';
import {
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  Building2,
  CircleDollarSign,
  MapPin,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { SyncProfile } from '@/api/types';
import {
  useBranches,
  useLeads,
  useLeadsReport,
  useUsers,
  getBranchDisplayLabel,
} from '@/api/hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ReportDonutChart } from '@/components/charts/report-donut-chart';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/loading-spinner';
import { CalendarIcon, XIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import {
  formatOwnerChartName,
  humanizeReportLabel,
} from '@/lib/utils/report-labels';
import { LeadsSummaryDialog } from '@/app/reports/components/leads-summary-dialog';
import { ATT_CHART_HSL } from '@/app/reports/components/reports-attendance-tab';
import type { ReportsMode } from '@/app/reports/reports-content';
import {
  buildPipelineValueAxis,
  formatAxisTickThousands,
  takeTopNWithOther,
} from '@/lib/utils/chart-series';

/** Max categories per chart (rest grouped as Other where applicable). */
const CHART_TOP_N = 10;

function getDefaultLeadsReportDateRange(): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  return { start: today, end: today };
}

const LEAD_STATUS_OPTIONS = [
  'PENDING',
  'APPROVED',
  'REVIEW',
  'DECLINED',
  'CONVERTED',
  'CANCELLED',
] as const;

const LEAD_SOURCE_OPTIONS = [
  'WEBSITE',
  'SOCIAL_MEDIA',
  'REFERRAL',
  'COLD_CALL',
  'EMAIL_CAMPAIGN',
  'TRADE_SHOW',
  'ADVERTISING',
  'DIRECT_MAIL',
  'PARTNER',
  'ORGANIC_SEARCH',
  'PAID_SEARCH',
  'CONTENT_MARKETING',
  'WEBINAR',
  'OTHER',
] as const;

const BAR_PALETTE = [
  ATT_CHART_HSL.c1,
  ATT_CHART_HSL.c2,
  ATT_CHART_HSL.c3,
  ATT_CHART_HSL.c4,
  ATT_CHART_HSL.c5,
];

function isElevatedAccess(profile: SyncProfile | null | undefined): boolean {
  const a = (profile?.accessLevel ?? '').toString().toLowerCase();
  return a === 'admin' || a === 'owner';
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(n);
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
}) {
  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className={cn('size-4 shrink-0', iconClassName)} />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export interface ReportsLeadsTabProps {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}

export function ReportsLeadsTab({ profile, reportsMode }: ReportsLeadsTabProps) {
  const [startDate, setStartDate] = useState(
    () => getDefaultLeadsReportDateRange().start
  );
  const [endDate, setEndDate] = useState(
    () => getDefaultLeadsReportDateRange().end
  );
  const [dateRangePopoverOpen, setDateRangePopoverOpen] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedOwnerUid, setSelectedOwnerUid] = useState<string>('all');
  const [summaryOpen, setSummaryOpen] = useState(false);

  const dateFrom = format(startDate, 'yyyy-MM-dd');
  const dateTo = format(endDate, 'yyyy-MM-dd');
  const elevated = isElevatedAccess(profile);

  const defaultReportRange = useMemo(
    () => getDefaultLeadsReportDateRange(),
    // Recompute when the local calendar day changes so “default” stays today.
    [format(startOfDay(new Date()), 'yyyy-MM-dd')]
  );

  const reportParams = useMemo(
    () => ({
      from: dateFrom,
      to: dateTo,
      dateBasis: 'activity' as const,
      ...(reportsMode === 'org' &&
      elevated &&
      selectedBranchId !== 'all'
        ? { branchId: Number(selectedBranchId) }
        : {}),
      ...(reportsMode === 'org' &&
      elevated &&
      selectedOwnerUid !== 'all'
        ? { ownerId: Number(selectedOwnerUid) }
        : {}),
      ...(selectedStatus !== 'all' ? { status: selectedStatus } : {}),
      ...(selectedSource !== 'all' ? { source: selectedSource } : {}),
    }),
    [
      dateFrom,
      dateTo,
      elevated,
      reportsMode,
      selectedBranchId,
      selectedOwnerUid,
      selectedStatus,
      selectedSource,
    ]
  );

  const reportQuery = useLeadsReport(reportParams, {
    enabled: Boolean(dateFrom && dateTo),
  });

  const listParams = useMemo(
    () => ({
      page: 1,
      limit: 500,
      startDate: dateFrom,
      endDate: dateTo,
      /** Align list scope with GET /leads/report (activity in range), not createdAt-only. */
      dateBasis: 'activity' as const,
      scope: (reportsMode === 'org' && elevated ? 'all' : 'me') as
        | 'all'
        | 'me',
      ...(reportsMode === 'org' &&
      elevated &&
      selectedOwnerUid !== 'all'
        ? { ownerId: Number(selectedOwnerUid) }
        : {}),
      ...(selectedStatus !== 'all' ? { status: selectedStatus } : {}),
      ...(selectedSource !== 'all' ? { source: selectedSource } : {}),
    }),
    [
      dateFrom,
      dateTo,
      elevated,
      reportsMode,
      selectedOwnerUid,
      selectedStatus,
      selectedSource,
    ]
  );

  const listQuery = useLeads(listParams, {
    enabled: Boolean(dateFrom && dateTo) && summaryOpen,
  });

  const summaryDialogLeads = useMemo(() => {
    const rows = listQuery.data?.data ?? [];
    if (!elevated || selectedBranchId === 'all') return rows;
    const bid = Number(selectedBranchId);
    return rows.filter(
      (l) => (l as { branch?: { uid?: number } }).branch?.uid === bid
    );
  }, [listQuery.data?.data, elevated, selectedBranchId]);

  const { data: branches = [] } = useBranches();
  const { data: usersList = [] } = useUsers({ limit: 200 });

  const report = reportQuery.data;

  const statusDonut = useMemo(() => {
    const rows = takeTopNWithOther(
      (report?.byStatus ?? []).map((r) => ({ name: r.name, value: r.value })),
      CHART_TOP_N
    );
    const slices = rows.map((row, i) => ({
      id: `s${i}`,
      label: humanizeReportLabel(row.name),
      value: row.value,
      fill: BAR_PALETTE[i % BAR_PALETTE.length],
    }));
    const cfg: ChartConfig = {};
    slices.forEach((s) => {
      cfg[s.id] = { label: s.label, color: s.fill };
    });
    const sum = slices.reduce((a, s) => a + s.value, 0);
    return { slices, config: cfg, sum };
  }, [report?.byStatus]);

  const valueBarConfig = {
    value: { label: 'Pipeline value', color: ATT_CHART_HSL.c4 },
  } satisfies ChartConfig;

  const valueBarData = useMemo(
    () =>
      takeTopNWithOther(
        (report?.valueByStatus ?? []).map((r) => ({
          name: r.name,
          value: r.value,
        })),
        CHART_TOP_N
      ).map((row) => ({
        status: humanizeReportLabel(row.name),
        value: row.value,
      })),
    [report?.valueByStatus]
  );

  const valueBarAxis = useMemo(() => {
    const maxVal =
      valueBarData.length === 0
        ? 0
        : Math.max(0, ...valueBarData.map((d) => d.value));
    return buildPipelineValueAxis(maxVal);
  }, [valueBarData]);

  const activityLineConfig = {
    count: { label: 'Leads touched', color: ATT_CHART_HSL.c2 },
  } satisfies ChartConfig;

  const isSingleDayRange = dateFrom === dateTo;
  const useHourlyActivity =
    isSingleDayRange && (report?.byHour?.length ?? 0) > 0;

  const activityLineChartData = useMemo(() => {
    if (!report) return [];
    if (useHourlyActivity) {
      return (report.byHour ?? []).map((d) => ({
        label: `${String(d.hour).padStart(2, '0')}:00`,
        count: d.count,
      }));
    }
    const counts = new Map((report.byDay ?? []).map((x) => [x.date, x.count]));
    const start = parseISO(dateFrom);
    const end = parseISO(dateTo);
    return eachDayOfInterval({ start, end }).map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      return { label: format(d, 'MMM d'), date: key, count: counts.get(key) ?? 0 };
    });
  }, [report, dateFrom, dateTo, useHourlyActivity]);

  const byUserTop = useMemo(
    () =>
      takeTopNWithOther(
        (report?.byUser ?? []).map((r) => ({ name: r.name, value: r.value })),
        CHART_TOP_N
      ),
    [report?.byUser]
  );

  const userActivityBarConfig = {
    count: { label: 'Leads', color: ATT_CHART_HSL.c2 },
  } satisfies ChartConfig;

  const userActivityBarData = useMemo(
    () =>
      byUserTop.map((row) => ({
        user: formatOwnerChartName(row.name),
        rawName: row.name,
        count: row.value,
      })),
    [byUserTop]
  );

  const byBranchTop = useMemo(
    () =>
      takeTopNWithOther(
        (report?.byBranch ?? []).map((r) => ({ name: r.name, value: r.value })),
        CHART_TOP_N
      ),
    [report?.byBranch]
  );

  const bySourceTop = useMemo(
    () =>
      takeTopNWithOther(
        (report?.bySource ?? []).map((r) => ({ name: r.name, value: r.value })),
        CHART_TOP_N
      ),
    [report?.bySource]
  );

  const byRegionTop = useMemo(
    () =>
      takeTopNWithOther(
        (report?.byRegion ?? []).map((r) => ({ name: r.name, value: r.value })),
        CHART_TOP_N
      ),
    [report?.byRegion]
  );

  const isActivityReport = reportParams.dateBasis === 'activity';
  const isDefaultRange =
    isSameDay(startDate, defaultReportRange.start) &&
    isSameDay(endDate, defaultReportRange.end);
  const periodLabel = `${dateFrom} – ${dateTo}`;
  const isLoading = reportQuery.isLoading;
  const total = report?.total ?? 0;
  const totalValue = report?.totalEstimatedValue ?? 0;
  const avgValue = total > 0 ? totalValue / total : 0;

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0">
            <Popover
              open={dateRangePopoverOpen}
              onOpenChange={setDateRangePopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 min-w-[140px] bg-white border-gray-200 text-foreground justify-center gap-2"
                >
                  <CalendarIcon className="size-4" />
                  {startDate.getTime() === endDate.getTime()
                    ? format(startDate, 'MMM d, yyyy')
                    : `${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto min-w-[480px] p-0 z-[10001]"
                align="start"
              >
                <div className="p-2 flex flex-col gap-3">
                  <div className="flex flex-row gap-6">
                    <div>
                      <p className="text-sm font-medium">Start date</p>
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => {
                          if (d) setStartDate(d);
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">End date</p>
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => {
                          if (d) setEndDate(d);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {!isDefaultRange ? (
              <button
                type="button"
                onClick={() => {
                  const r = getDefaultLeadsReportDateRange();
                  setStartDate(r.start);
                  setEndDate(r.end);
                }}
                className="shrink-0 rounded p-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-600 cursor-pointer ml-0.5"
                aria-label="Reset date range"
              >
                <XIcon className="size-4 text-red-600" />
              </button>
            ) : null}
          </div>

          {reportsMode === 'org' && elevated ? (
            <Select
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
            >
              <SelectTrigger className="h-9 min-w-[140px] w-[200px] bg-white border-gray-200 text-foreground">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.uid} value={String(b.uid)}>
                    {getBranchDisplayLabel(b) || `Branch ${b.uid}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] bg-white border-gray-200 text-foreground">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="z-[10001]">
              <SelectItem value="all">All statuses</SelectItem>
              {LEAD_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] bg-white border-gray-200 text-foreground">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent className="z-[10001]">
              <SelectItem value="all">All sources</SelectItem>
              {LEAD_SOURCE_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {reportsMode === 'org' && elevated ? (
            <Select value={selectedOwnerUid} onValueChange={setSelectedOwnerUid}>
              <SelectTrigger className="h-9 min-w-[140px] w-[200px] bg-white border-gray-200 text-foreground">
                <SelectValue placeholder="All owners" />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                <SelectItem value="all">All owners</SelectItem>
                {usersList.map((u) => {
                  const fullName =
                    [u.name, u.surname].filter(Boolean).join(' ').trim() ||
                    u.email ||
                    `User ${u.uid}`;
                  return (
                    <SelectItem key={u.uid} value={String(u.uid)}>
                      <span className="flex items-center gap-2">
                        <Avatar className="size-6 shrink-0">
                          <AvatarImage src={undefined} alt="" />
                          <AvatarFallback className="text-xs">
                            {fullName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {fullName}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="flex flex-nowrap items-center gap-2 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 bg-white border-gray-200 text-foreground gap-2 shrink-0"
            onClick={() => setSummaryOpen(true)}
          >
            <BarChart3 className="size-4" />
            Summary
          </Button>
        </div>
      </div>

      <LeadsSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        leads={summaryDialogLeads}
        isLoading={listQuery.isLoading}
        periodLabel={periodLabel}
      />

      {isLoading ? (
        <LoadingSpinner wrapperClassName="py-16" />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Lead activity
            </h2>
            <Card className="border-gray-200 bg-white">
              <CardHeader>
                <CardTitle>
                  {useHourlyActivity
                    ? 'Lead activity by hour'
                    : 'Lead activity over time'}
                </CardTitle>
                <CardDescription>
                  {isActivityReport
                    ? useHourlyActivity
                      ? 'Count of leads touched (updated after creation) by hour for the selected day — organization timezone.'
                      : 'Daily count of leads with activity in range: last update falls between the dates and is after the record was created.'
                    : 'Leads in report cohort by day or hour.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={activityLineConfig}
                  className="aspect-auto h-[300px] w-full"
                >
                  <LineChart
                    data={activityLineChartData}
                    margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={useHourlyActivity ? 2 : 'preserveStartEnd'}
                      tick={{ fontSize: useHourlyActivity ? 10 : 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-count)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Period summary
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label={isActivityReport ? 'Leads touched' : 'Total leads'}
                value={String(total)}
                icon={Users}
                iconClassName="text-violet-600"
              />
              <KpiCard
                label="Pipeline value"
                value={formatCurrency(totalValue)}
                icon={CircleDollarSign}
                iconClassName="text-emerald-600"
              />
              <KpiCard
                label="Avg. value / lead"
                value={formatCurrency(avgValue)}
                icon={TrendingUp}
                iconClassName="text-sky-600"
              />
              <KpiCard
                label="Statuses represented"
                value={String(report?.byStatus?.length ?? 0)}
                icon={Tag}
                iconClassName="text-amber-600"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Pipeline and status
            </h2>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              <Card className="border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle>Leads by status</CardTitle>
                  <CardDescription>
                    Top 10 statuses by count (remaining grouped as Other)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statusDonut.slices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No data
                    </p>
                  ) : (
                    <ReportDonutChart
                      config={statusDonut.config}
                      data={statusDonut.slices}
                      centerPrimary={statusDonut.sum.toLocaleString()}
                      centerSecondary="Total Leads"
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle>Value by status</CardTitle>
                  <CardDescription>
                    Top 10 statuses by pipeline value (remaining grouped as Other)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={valueBarConfig}
                    className="aspect-auto h-[280px] w-full"
                  >
                    <BarChart
                      data={valueBarData}
                      accessibilityLayer
                      margin={{ top: 28, right: 8, left: 8, bottom: 8 }}
                      barCategoryGap="20%"
                      barGap={4}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="status"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        angle={-25}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        domain={[0, valueBarAxis.domainMax]}
                        ticks={valueBarAxis.ticks}
                        tickFormatter={formatAxisTickThousands}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar
                        dataKey="value"
                        radius={8}
                        fill="var(--color-value)"
                      >
                        <LabelList
                          position="top"
                          dataKey="value"
                          offset={6}
                          className="fill-foreground text-xs"
                          formatter={(v: number | string) =>
                            formatCurrency(Number(v))
                          }
                        />
                      </Bar>
                      <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border-gray-200 bg-white">
              <CardHeader>
                <CardTitle>Lead activity by user</CardTitle>
                <CardDescription>
                  Top 10 owners by lead count in range (remaining grouped as
                  Other)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userActivityBarData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No data
                  </p>
                ) : (
                  <ChartContainer
                    config={userActivityBarConfig}
                    className="aspect-auto h-[300px] w-full"
                  >
                    <BarChart
                      data={userActivityBarData}
                      accessibilityLayer
                      margin={{ top: 28, right: 8, left: 8, bottom: 8 }}
                      barCategoryGap="20%"
                      barGap={4}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="user"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        angle={-25}
                        textAnchor="end"
                        height={70}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          String(v).length > 20
                            ? `${String(v).slice(0, 18)}…`
                            : String(v)
                        }
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            hideLabel
                            formatter={(value, _name, item) => (
                              <div className="flex w-full flex-wrap items-center justify-between gap-2 gap-x-4">
                                <span className="text-muted-foreground">
                                  {String(
                                    (
                                      item?.payload as {
                                        rawName?: string;
                                      }
                                    )?.rawName ?? ''
                                  )}
                                </span>
                                <span className="text-foreground font-mono font-medium tabular-nums">
                                  {typeof value === 'number'
                                    ? value.toLocaleString()
                                    : String(value)}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="count" radius={8}>
                        {userActivityBarData.map((entry, index) => (
                          <Cell
                            key={`${entry.rawName}-${index}`}
                            fill={
                              BAR_PALETTE[index % BAR_PALETTE.length]
                            }
                          />
                        ))}
                        <LabelList
                          position="top"
                          dataKey="count"
                          offset={6}
                          className="fill-foreground text-xs"
                        />
                      </Bar>
                      <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Breakdowns
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <BreakdownBarCard
                title="By owner"
                description="Top 10 owners by lead count"
                data={byUserTop}
                icon={Users}
                ownerShortNames
              />
              <BreakdownPieCard
                title="By source"
                description="Top 10 sources by lead count"
                data={bySourceTop}
                icon={Tag}
                humanizeLabels
                centerSecondary="Leads"
              />
              <BreakdownPieCard
                title="By region"
                description="Top 10 regions by lead count"
                data={byRegionTop}
                icon={MapPin}
                humanizeLabels
                centerSecondary="Leads"
              />
              <BreakdownBarCard
                title="By branch"
                description="Top 10 branches by lead count"
                data={byBranchTop}
                icon={Building2}
              />
            </div>
          </section>

          {total === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              No leads in this period for the selected filters.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function BreakdownPieCard({
  title,
  description,
  data,
  icon: Icon,
  humanizeLabels,
  centerSecondary = 'Leads',
}: {
  title: string;
  description: string;
  data: { name: string; value: number }[];
  icon: ComponentType<{ className?: string }>;
  humanizeLabels?: boolean;
  centerSecondary?: string;
}) {
  const pieSlices = useMemo(() => {
    return (data ?? []).map((row, i) => ({
      id: `s${i}`,
      label: humanizeLabels ? humanizeReportLabel(row.name) : row.name,
      value: row.value,
      fill: BAR_PALETTE[i % BAR_PALETTE.length],
    }));
  }, [data, humanizeLabels]);

  const pieConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    pieSlices.forEach((row) => {
      cfg[row.id] = { label: row.label, color: row.fill };
    });
    return cfg;
  }, [pieSlices]);

  const sum = useMemo(
    () => pieSlices.reduce((a, s) => a + s.value, 0),
    [pieSlices]
  );

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader className="flex flex-row items-start gap-2">
        <Icon className="size-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {pieSlices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No data
          </p>
        ) : (
          <ReportDonutChart
            config={pieConfig}
            data={pieSlices}
            centerPrimary={sum.toLocaleString()}
            centerSecondary={centerSecondary}
          />
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownBarCard({
  title,
  description,
  data,
  icon: Icon,
  ownerShortNames,
}: {
  title: string;
  description: string;
  data: { name: string; value: number }[];
  icon: ComponentType<{ className?: string }>;
  ownerShortNames?: boolean;
}) {
  const chartData = useMemo(
    () =>
      data.map((row, i) => {
        const fill = BAR_PALETTE[i % BAR_PALETTE.length];
        if (ownerShortNames) {
          return {
            name: formatOwnerChartName(row.name),
            rawName: row.name,
            value: row.value,
            fill,
          };
        }
        return {
          name: row.name,
          value: row.value,
          fill,
        };
      }),
    [data, ownerShortNames]
  );

  const config = {
    value: { label: 'Leads', color: ATT_CHART_HSL.c3 },
  } satisfies ChartConfig;

  return (
    <Card className="border-gray-200 bg-white">
      <CardHeader className="flex flex-row items-start gap-2">
        <Icon className="size-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No data
          </p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              accessibilityLayer
              margin={{ left: 4, right: 44, top: 4, bottom: 4 }}
              barCategoryGap="6%"
              barGap={2}
            >
              <XAxis type="number" dataKey="value" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={84}
                tickLine={false}
                tickMargin={4}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  String(v).length > 20 ? `${String(v).slice(0, 18)}…` : String(v)
                }
              />
              <ChartTooltip
                cursor={false}
                content={
                  ownerShortNames ? (
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => (
                        <div className="flex w-full flex-wrap items-center justify-between gap-2 gap-x-4">
                          <span className="text-muted-foreground">
                            {String(
                              (
                                item?.payload as {
                                  rawName?: string;
                                  name?: string;
                                }
                              ).rawName ??
                                (item?.payload as { name?: string })?.name ??
                                ''
                            )}
                          </span>
                          <span className="text-foreground font-mono font-medium tabular-nums">
                            {typeof value === 'number'
                              ? value.toLocaleString()
                              : String(value)}
                          </span>
                        </div>
                      )}
                    />
                  ) : (
                    <ChartTooltipContent hideLabel />
                  )
                }
              />
              <Bar dataKey="value" radius={5}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`${'rawName' in entry ? entry.rawName : entry.name}-${index}`}
                    fill={entry.fill}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  offset={6}
                  className="fill-foreground text-[11px]"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
