'use client';

import { useCallback, useMemo, useState, type ComponentType } from 'react';
import type { DateRange } from 'react-day-picker';
import {
  format,
  eachDayOfInterval,
  parseISO,
} from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Building2,
  CalendarIcon,
  CircleDollarSign,
  Layers,
  MapPin,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { BranchListItem } from '@/api/types/branch';
import type { SyncProfile } from '@/api/types';
import {
  useBranches,
  useLeadsReport,
  useUsers,
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
import { LoadingSpinner } from '@/components/loading-spinner';
import { XIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import {
  formatOwnerChartName,
  humanizeReportLabel,
} from '@/lib/utils/report-labels';
import {
  SearchableBranchPicker,
  SearchableOptionListPicker,
  SearchableUserPicker,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
} from '@/app/reports/components/reports-searchable-filter-comboboxes';
import type { SearchableOptionRow } from '@/app/reports/components/reports-searchable-filter-comboboxes';
import { ATT_CHART_HSL } from '@/app/reports/components/reports-attendance-tab';
import type { ReportsMode } from '@/app/reports/reports-content';
import {
  userListItemInLeadsVisitsReportingCohort,
} from '@/app/reports/utils/user-has-performance-target';
import {
  formatUtcCalendarLabel,
  formatUtcYmd,
  getUtcMonthRange,
  orderUtcCalendarRange,
  utcCalendarDateFromLocalPickerDate,
  utcDateFromYmd,
  utcMonthStartThroughToday,
  utcToday,
} from '@/app/reports/utils/overview-daily-summary';
import {
  buildPipelineValueAxis,
  formatAxisTickThousands,
  takeTopNWithOther,
} from '@/lib/utils/chart-series';

/** Max categories per chart (rest grouped as Other where applicable). */
const CHART_TOP_N = 10;

const LEAD_STATUS_OPTIONS = [
  'PENDING',
  'APPROVED',
  'REVIEW',
  'DECLINED',
  'CONVERTED',
  'CANCELLED',
  'DISCARDED',
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

const LEAD_STATUS_PICKER_OPTIONS: SearchableOptionRow[] =
  LEAD_STATUS_OPTIONS.map((s) => ({
    value: s,
    label: humanizeReportLabel(s),
    icon: <Tag className="size-4 shrink-0" />,
    searchExtra: s,
  }));

const LEAD_SOURCE_PICKER_OPTIONS: SearchableOptionRow[] =
  LEAD_SOURCE_OPTIONS.map((s) => ({
    value: s,
    label: humanizeReportLabel(s),
    icon: <Layers className="size-4 shrink-0" />,
    searchExtra: s.replace(/_/g, ' '),
  }));

const BAR_PALETTE = [
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
  const [startDate, setStartDate] = useState(() => utcMonthStartThroughToday().start);
  const [endDate, setEndDate] = useState(() => utcMonthStartThroughToday().end);
  const [dateRangePopoverOpen, setDateRangePopoverOpen] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedOwnerUid, setSelectedOwnerUid] = useState<string>('all');

  const [draft, setDraft] = useState<DateRange | undefined>(() => {
    const r = utcMonthStartThroughToday();
    return { from: r.start, to: r.end };
  });

  const dateFrom = formatUtcYmd(startDate);
  const dateTo = formatUtcYmd(endDate);
  const elevated = isElevatedAccess(profile);

  const defaultReportRange = utcMonthStartThroughToday();

  const finalizeDraftRange = useCallback(() => {
    const from = draft?.from ?? startDate;
    const toRaw = draft?.to ?? draft?.from ?? endDate;
    const ordered = orderUtcCalendarRange(from, toRaw);
    setStartDate(ordered.start);
    setEndDate(ordered.end);
  }, [draft, startDate, endDate]);

  const handleDateRangePopoverOpenChange = useCallback(
    (open: boolean) => {
      if (open) setDraft({ from: startDate, to: endDate });
      else finalizeDraftRange();
      setDateRangePopoverOpen(open);
    },
    [startDate, endDate, finalizeDraftRange]
  );

  const { data: branches = [] } = useBranches();
  const { data: usersList = [] } = useUsers({
    limit: 200,
    enabled: reportsMode === 'org' && elevated,
    ...(selectedBranchId !== 'all'
      ? { branchId: Number(selectedBranchId) }
      : {}),
  });

  const reportingUsers = useMemo(
    () =>
      reportsMode === 'org' && elevated
        ? usersList.filter(userListItemInLeadsVisitsReportingCohort)
        : usersList,
    [elevated, reportsMode, usersList]
  );

  const effectiveOwnerUid = useMemo(() => {
    if (!(reportsMode === 'org' && elevated) || selectedOwnerUid === 'all') {
      return selectedOwnerUid;
    }
    return reportingUsers.some((u) => String(u.uid) === selectedOwnerUid)
      ? selectedOwnerUid
      : 'all';
  }, [elevated, reportsMode, reportingUsers, selectedOwnerUid]);

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
      effectiveOwnerUid !== 'all'
        ? { ownerId: Number(effectiveOwnerUid) }
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
      effectiveOwnerUid,
      selectedStatus,
      selectedSource,
    ]
  );

  const reportQuery = useLeadsReport(reportParams, {
    enabled: Boolean(dateFrom && dateTo),
  });

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
    formatUtcYmd(startDate) === formatUtcYmd(defaultReportRange.start) &&
    formatUtcYmd(endDate) === formatUtcYmd(defaultReportRange.end);
  const isLoading = reportQuery.isLoading;
  const total = report?.total ?? 0;
  const totalValue = report?.totalEstimatedValue ?? 0;
  const avgValue = total > 0 ? totalValue / total : 0;

  return (
    <div className="space-y-8 py-4">
      <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full flex-nowrap items-center gap-2">
          <div className="flex items-center gap-0">
            <Popover
              open={dateRangePopoverOpen}
              onOpenChange={handleDateRangePopoverOpenChange}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    reportsFilterSelectTriggerClass,
                    'h-9 min-w-[220px] shrink-0 justify-start text-left font-normal sm:min-w-[260px] gap-2'
                  )}
                >
                  <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                  {formatUtcYmd(startDate) === formatUtcYmd(endDate)
                    ? formatUtcCalendarLabel(startDate)
                    : `${formatUtcCalendarLabel(startDate)} – ${formatUtcCalendarLabel(endDate)}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className={cn('w-[95vw] max-w-lg p-0 sm:w-auto', reportsFilterPortalHighZ)}
                align="center"
              >
                <Calendar
                  mode="range"
                  selected={draft}
                  onSelect={(r) => {
                    if (!r) {
                      setDraft(undefined);
                      return;
                    }
                    setDraft({
                      from: r.from
                        ? utcCalendarDateFromLocalPickerDate(r.from)
                        : undefined,
                      to: r.to
                        ? utcCalendarDateFromLocalPickerDate(r.to)
                        : undefined,
                    });
                  }}
                  initialFocus
                  numberOfMonths={2}
                />
                <div className="flex flex-wrap justify-between gap-2 border-t px-2 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const t = utcToday();
                        setStartDate(t);
                        setEndDate(t);
                        setDateRangePopoverOpen(false);
                      }}
                    >
                      Today (UTC)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const { start, end } = utcMonthStartThroughToday();
                        setStartDate(start);
                        setEndDate(end);
                        setDateRangePopoverOpen(false);
                      }}
                    >
                      This month (UTC)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const { from, to } = getUtcMonthRange(utcToday());
                        setStartDate(utcDateFromYmd(from));
                        setEndDate(utcDateFromYmd(to));
                        setDateRangePopoverOpen(false);
                      }}
                    >
                      Whole month (UTC)
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className={cn(
                      'bg-violet-600 text-white shadow-sm border-transparent',
                      'hover:bg-violet-700 hover:text-white',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2'
                    )}
                    onClick={() => handleDateRangePopoverOpenChange(false)}
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {!isDefaultRange ? (
              <button
                type="button"
                onClick={() => {
                  const r = utcMonthStartThroughToday();
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
            <SearchableBranchPicker
              branches={branches as BranchListItem[]}
              selectedBranchId={selectedBranchId}
              onBranchChange={(v) => {
                setSelectedBranchId(v);
                setSelectedOwnerUid('all');
              }}
              triggerClassName="h-9 w-[180px] shrink-0 sm:min-w-[200px] sm:w-[200px]"
            />
          ) : null}

          <SearchableOptionListPicker
            selectedValue={selectedStatus}
            onValueChange={setSelectedStatus}
            options={LEAD_STATUS_PICKER_OPTIONS}
            placeholderLabelWhenAll="All statuses"
            searchPlaceholder="Search statuses…"
            emptyMessage="No status found."
            triggerIcon={<Tag className="size-4 shrink-0" />}
            triggerClassName="h-9 w-[170px] shrink-0 sm:w-[200px]"
          />

          <SearchableOptionListPicker
            selectedValue={selectedSource}
            onValueChange={setSelectedSource}
            options={LEAD_SOURCE_PICKER_OPTIONS}
            placeholderLabelWhenAll="All sources"
            searchPlaceholder="Search sources…"
            emptyMessage="No source found."
            triggerIcon={<Layers className="size-4 shrink-0" />}
            triggerClassName="h-9 w-[180px] shrink-0 sm:w-[200px]"
          />

          {reportsMode === 'org' && elevated ? (
            <SearchableUserPicker
              users={reportingUsers}
              branches={branches as BranchListItem[]}
              selectedUid={effectiveOwnerUid}
              onUidChange={setSelectedOwnerUid}
              allOptionLabel="All owners"
              triggerClassName="h-9 w-[180px] shrink-0 sm:min-w-[220px] sm:w-[220px]"
              searchPlaceholder="Search owners…"
            />
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner wrapperClassName="py-16" />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Lead activity
            </h2>
            <Card className="min-w-0 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle>
                  {useHourlyActivity
                    ? 'Lead activity by hour'
                    : 'Lead activity over time'}
                </CardTitle>
                <CardDescription>
                  {isActivityReport
                    ? useHourlyActivity
                      ? 'Count of leads with updatedAt in range by hour for the selected day — organization timezone.'
                      : 'Daily count of leads whose updatedAt falls in the range (new creates and edits).'
                    : 'Leads in report cohort by day or hour.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={activityLineConfig}
                  className="aspect-auto h-[300px] w-full"
                >
                  <AreaChart
                    data={activityLineChartData}
                    margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient
                        id="fillLeadActivity"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-count)"
                          stopOpacity={0.85}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-count)"
                          stopOpacity={0.12}
                        />
                      </linearGradient>
                    </defs>
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
                    <Area
                      type="natural"
                      dataKey="count"
                      name={String(activityLineConfig.count.label)}
                      stroke="var(--color-count)"
                      strokeWidth={2}
                      fill="url(#fillLeadActivity)"
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
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
              <Card className="min-w-0 border-gray-200 bg-white">
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

              <Card className="min-w-0 border-gray-200 bg-white">
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

            <Card className="min-w-0 border-gray-200 bg-white">
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
    <Card className="min-w-0 border-gray-200 bg-white">
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
    <Card className="min-w-0 border-gray-200 bg-white">
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
