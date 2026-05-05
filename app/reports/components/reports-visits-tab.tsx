'use client';

import {
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  format,
  isSameDay,
  startOfDay,
  endOfDay,
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
import { BarChart3, Clock, Contact, Timer, Users } from 'lucide-react';
import type { SyncProfile } from '@/api/types';
import type { BranchListItem } from '@/api/types/branch';
import { useBranches, useCheckIns, useUsers, getBranchDisplayLabel } from '@/api/hooks';
import type { VisitExportItem } from '@/api/types/reports';
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
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, XIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { REPORT_CHART_HSL } from '@/app/reports/components/reports-chart-palette';
import { VisitsSummaryDialog } from '@/app/reports/components/visits-summary-dialog';
import {
  filterVisitCheckIns,
  getSortedUniqueBusinessTypes,
  getSortedUniqueRegions,
} from '@/lib/utils/visit-history-filters';
import {
  getRegionGroupKey,
  getVisitBranchUid,
  mapCheckInsFromApi,
  parseDurationToMinutes,
  resolveBranchChartLabel,
} from '@/lib/utils/visits-export';
import { METHOD_OPTIONS } from '@/lib/visit-form-utils';
import { formatOwnerChartName } from '@/lib/utils/report-labels';
import type { ReportsMode } from '@/app/reports/reports-content';
import {
  buildReportingUserUidSet,
  filterVisitExportItemsByReportingUserUids,
  userListItemInLeadsVisitsReportingCohort,
} from '@/app/reports/utils/user-has-performance-target';

const PALETTE = [
  REPORT_CHART_HSL.c1,
  REPORT_CHART_HSL.c2,
  REPORT_CHART_HSL.c3,
  REPORT_CHART_HSL.c4,
  REPORT_CHART_HSL.c5,
] as const;

/** Top N for user / branch breakdown bars and quotation-by-rep chart. */
const TOP_VISITS_BREAKDOWN = 5;
/** Top regions shown in the full-width vertical bar chart. */
const TOP_REGION_BREAKDOWN = 10;
const TOP_PIE_SLICES = 8;
const TOP_VALUE_USERS = TOP_VISITS_BREAKDOWN;
const TOP_AVG_DURATION_CUSTOMERS = 8;

function topNWithOther(
  entries: [string, number][],
  n: number,
  otherLabel = 'Other'
): { name: string; value: number; fill: string }[] {
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return [];
  if (sorted.length <= n) {
    return sorted.map(([name, value], i) => ({
      name,
      value,
      fill: PALETTE[i % PALETTE.length],
    }));
  }
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n).reduce((s, [, v]) => s + v, 0);
  return [
    ...top.map(([name, value], i) => ({
      name,
      value,
      fill: PALETTE[i % PALETTE.length],
    })),
    {
      name: otherLabel,
      value: rest,
      fill: 'hsl(215 14% 46%)',
    },
  ];
}

function ownerDisplayName(c: VisitExportItem): string {
  const o = c.owner;
  if (!o) return 'Unknown';
  const n = [o.name, (o as { surname?: string }).surname]
    .filter(Boolean)
    .join(' ')
    .trim();
  return n || o.email || `User ${(o as { uid?: number }).uid ?? ''}`;
}

function customerKey(c: VisitExportItem): string {
  if (c.client?.uid != null) return `client:${c.client.uid}`;
  const label = [c.companyName, c.contactFullName].filter(Boolean).join(' | ').trim();
  return label ? `label:${label}` : `visit:${c.uid}`;
}

function customerDisplayName(c: VisitExportItem): string {
  return (
    c.client?.name?.trim() ||
    c.companyName?.trim() ||
    c.contactFullName?.trim() ||
    'Unknown'
  );
}

function filterByBranch(
  items: VisitExportItem[],
  branchUid: string
): VisitExportItem[] {
  if (branchUid === 'all') return items;
  const bid = Number(branchUid);
  if (!Number.isFinite(bid)) return items;
  return items.filter((c) => getVisitBranchUid(c) === bid);
}

function filterByMethod(
  items: VisitExportItem[],
  method: string
): VisitExportItem[] {
  if (method === 'all') return items;
  const want = method.trim().toLowerCase();
  return items.filter((c) => {
    const m = (c.methodOfContact ?? '').trim().toLowerCase();
    if (m === want) return true;
    if (want === 'physical' && (m === 'in-person' || m === 'physical')) return true;
    if (want === 'telephone' && m === 'phone-call') return true;
    if (want === 'whatsapp' && m === 'whatsapp') return true;
    if (want === 'email' && m === 'email') return true;
    return false;
  });
}

function formatMinutesRounded(m: number): string {
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return `${h}h ${min}m`;
}

function aggregateCountMap(
  items: VisitExportItem[],
  keyFn: (c: VisitExportItem) => string
): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of items) {
    const k = keyFn(c);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/**
 * Coerce API `salesValue` to a finite number. Prevents string concatenation
 * and NaN from breaking Recharts / recharts-scale (decimal.js) tick math.
 */
function toFiniteSalesAmount(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const visitsBreakdownBarConfig = {
  value: { label: 'Visits', color: REPORT_CHART_HSL.c4 },
} satisfies ChartConfig;

const avgMinutesBarConfig = {
  minutes: { label: 'Avg duration (min)', color: REPORT_CHART_HSL.c4 },
} satisfies ChartConfig;

/** Matches Overview “Visits trend” stroke (c4). */
const lineHourConfig = {
  count: { label: 'Visits', color: REPORT_CHART_HSL.c4 },
} satisfies ChartConfig;

export interface ReportsVisitsTabProps {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}

export function ReportsVisitsTab({
  profile,
  reportsMode,
}: ReportsVisitsTabProps) {
  const today = startOfDay(new Date());

  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const [endDate, setEndDate] = useState(() => startOfDay(new Date()));
  const [dateRangePopoverOpen, setDateRangePopoverOpen] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [selectedUserUid, setSelectedUserUid] = useState('all');

  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedBusinessType, setSelectedBusinessType] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [summaryOpen, setSummaryOpen] = useState(false);

  const startIso = startOfDay(startDate).toISOString();
  const endIso = endOfDay(endDate).toISOString();

  const { data: branches = [] } = useBranches();
  const { data: usersList = [] } = useUsers({
    limit: 200,
    enabled: reportsMode === 'org',
    ...(selectedBranchId !== 'all'
      ? { branchId: Number(selectedBranchId) }
      : {}),
  });

  const reportingUsers = useMemo(
    () =>
      reportsMode === 'org'
        ? usersList.filter(userListItemInLeadsVisitsReportingCohort)
        : usersList,
    [reportsMode, usersList]
  );

  const reportingUidSet = useMemo(
    () => buildReportingUserUidSet(reportingUsers),
    [reportingUsers]
  );

  const effectiveOwnerUid = useMemo(() => {
    if (reportsMode !== 'org' || selectedUserUid === 'all') {
      return selectedUserUid;
    }
    return reportingUsers.some((u) => String(u.uid) === selectedUserUid)
      ? selectedUserUid
      : 'all';
  }, [reportsMode, reportingUsers, selectedUserUid]);

  const checkInUserUid =
    reportsMode === 'self' && profile?.uid != null
      ? String(profile.uid)
      : effectiveOwnerUid !== 'all'
        ? effectiveOwnerUid
        : undefined;

  const checkInsQuery = useCheckIns(
    {
      startDate: startIso,
      endDate: endIso,
      ...(checkInUserUid ? { userUid: checkInUserUid } : {}),
    },
    { enabled: true }
  );

  const mappedRaw = useMemo(
    () =>
      mapCheckInsFromApi(
        checkInsQuery.data?.checkIns ?? [],
        usersList,
        branches as BranchListItem[]
      ),
    [branches, checkInsQuery.data?.checkIns, usersList]
  );

  const uniqueRegions = useMemo(
    () => getSortedUniqueRegions(mappedRaw),
    [mappedRaw]
  );
  const uniqueBusinessTypes = useMemo(
    () => getSortedUniqueBusinessTypes(mappedRaw),
    [mappedRaw]
  );

  const filteredVisits = useMemo(() => {
    let list = filterByBranch(mappedRaw, selectedBranchId);
    list = filterVisitCheckIns(list, {
      selectedRegion: selectedRegion || '',
      selectedBusinessType: selectedBusinessType || '',
      searchQuery: '',
    });
    list = filterByMethod(list, selectedMethod);
    if (reportsMode === 'org' && effectiveOwnerUid === 'all') {
      list = filterVisitExportItemsByReportingUserUids(
        list,
        reportingUidSet,
        true
      );
    }
    return list;
  }, [
    mappedRaw,
    selectedBranchId,
    selectedRegion,
    selectedBusinessType,
    selectedMethod,
    reportsMode,
    effectiveOwnerUid,
    reportingUidSet,
  ]);

  const visitsByUserBar = useMemo(() => {
    const m = aggregateCountMap(filteredVisits, ownerDisplayName);
    const arr = [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_VISITS_BREAKDOWN);
    return arr.map(([name, count], i) => ({
      name: formatOwnerChartName(name),
      rawName: name,
      value: count,
      fill: PALETTE[i % PALETTE.length],
    }));
  }, [filteredVisits]);

  const visitsByBranchBar = useMemo(() => {
    const m = aggregateCountMap(filteredVisits, (c) =>
      resolveBranchChartLabel(c, branches as BranchListItem[])
    );
    const arr = [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_VISITS_BREAKDOWN);
    return arr.map(([name, count], i) => ({
      name: name.length > 28 ? `${name.slice(0, 26)}…` : name,
      value: count,
      fill: PALETTE[i % PALETTE.length],
    }));
  }, [filteredVisits, branches]);

  const visitsByRegionBar = useMemo(() => {
    const m = aggregateCountMap(filteredVisits, (c) => getRegionGroupKey(c));
    const arr = [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_REGION_BREAKDOWN);
    return arr.map(([name, count], i) => ({
      name,
      value: count,
      fill: PALETTE[i % PALETTE.length],
    }));
  }, [filteredVisits]);

  const visitsByHourLine = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h.toString().padStart(2, '0')}:00`,
      h,
      count: 0,
    }));
    for (const c of filteredVisits) {
      const d = new Date(c.checkInTime);
      if (Number.isNaN(d.getTime())) continue;
      const h = d.getHours();
      buckets[h].count += 1;
    }
    return buckets;
  }, [filteredVisits]);

  const allocationPie = useMemo(() => {
    const m = aggregateCountMap(filteredVisits, ownerDisplayName);
    const entries = [...m.entries()] as [string, number][];
    return topNWithOther(entries, TOP_PIE_SLICES);
  }, [filteredVisits]);

  const customerPie = useMemo(() => {
    const m = aggregateCountMap(filteredVisits, (c) => customerDisplayName(c));
    const entries = [...m.entries()] as [string, number][];
    return topNWithOther(entries, TOP_PIE_SLICES);
  }, [filteredVisits]);

  const { avgDurationPerCustomerKpi, avgDurationByCustomerBars } = useMemo(() => {
    const byKey = new Map<
      string,
      { total: number; n: number; label: string }
    >();
    for (const c of filteredVisits) {
      if (!c.checkOutTime || !c.duration) continue;
      const mins = parseDurationToMinutes(c.duration);
      if (mins <= 0) continue;
      const key = customerKey(c);
      const label = customerDisplayName(c);
      const cur = byKey.get(key) ?? { total: 0, n: 0, label };
      cur.total += mins;
      cur.n += 1;
      cur.label = label;
      byKey.set(key, cur);
    }
    const avgs = [...byKey.values()].map((v) => ({
      label: v.label,
      avg: v.n > 0 ? v.total / v.n : 0,
    }));
    const kpi =
      avgs.length > 0
        ? avgs.reduce((s, x) => s + x.avg, 0) / avgs.length
        : null;
    const bars = [...avgs]
      .sort((a, b) => b.avg - a.avg)
      .slice(0, TOP_AVG_DURATION_CUSTOMERS)
      .map((x, i) => ({
        name: x.label.length > 22 ? `${x.label.slice(0, 20)}…` : x.label,
        minutes: Math.round(x.avg * 10) / 10,
        fill: PALETTE[i % PALETTE.length],
      }));
    return { avgDurationPerCustomerKpi: kpi, avgDurationByCustomerBars: bars };
  }, [filteredVisits]);

  const valueByUserBar = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of filteredVisits) {
      const name = ownerDisplayName(c);
      const addend = toFiniteSalesAmount(c.salesValue);
      if (addend == null || addend === 0) continue;
      m.set(name, (m.get(name) ?? 0) + addend);
    }
    const arr = [...m.entries()]
      .filter(([, value]) => Number.isFinite(value) && value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_VALUE_USERS);
    return arr.map(([name, value], i) => ({
      name: formatOwnerChartName(name),
      rawName: name,
      value,
      fill: PALETTE[i % PALETTE.length],
    }));
  }, [filteredVisits]);

  const valueByUserConfig = {
    value: { label: 'Quotation value', color: REPORT_CHART_HSL.c3 },
  } satisfies ChartConfig;

  const isDefaultRange =
    isSameDay(startDate, today) && isSameDay(endDate, today);
  const periodLabel = `${format(startDate, 'yyyy-MM-dd')} – ${format(endDate, 'yyyy-MM-dd')}`;
  const showVisitsSkeleton =
    checkInsQuery.isLoading && !checkInsQuery.data;
  const hasVisits = filteredVisits.length > 0;

  const userShareDonut = useMemo(() => {
    const slices = allocationPie.map((p, i) => ({
      id: `u${i}`,
      label: p.name === 'Other' ? p.name : formatOwnerChartName(p.name),
      value: p.value,
      fill: p.fill,
    }));
    const config: ChartConfig = {};
    slices.forEach((s) => {
      config[s.id] = { label: s.label, color: s.fill };
    });
    const sum = slices.reduce((a, s) => a + s.value, 0);
    return { slices, config, sum };
  }, [allocationPie]);

  const customerShareDonut = useMemo(() => {
    const slices = customerPie.map((p, i) => ({
      id: `c${i}`,
      label: p.name,
      value: p.value,
      fill: p.fill,
    }));
    const config: ChartConfig = {};
    slices.forEach((s) => {
      config[s.id] = { label: s.label, color: s.fill };
    });
    const sum = slices.reduce((a, s) => a + s.value, 0);
    return { slices, config, sum };
  }, [customerPie]);

  return (
    <div className="space-y-8 py-4">
      <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full flex-nowrap items-center gap-2">
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
                  className="h-9 w-[185px] shrink-0 bg-white border-gray-200 text-foreground justify-center gap-2 sm:w-auto"
                >
                  <CalendarIcon className="size-4" />
                  {startDate.getTime() === endDate.getTime()
                    ? format(startDate, 'MMM d, yyyy')
                    : `${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[10001] w-[80vw] max-w-[34rem] p-0" align="center">
                <div className="p-2 flex flex-col gap-3">
                  <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
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
                  const d = startOfDay(new Date());
                  setStartDate(d);
                  setEndDate(d);
                }}
                className="shrink-0 rounded p-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-600 cursor-pointer ml-0.5"
                aria-label="Reset date range"
              >
                <XIcon className="size-4 text-red-600" />
              </button>
            ) : null}
          </div>

          <Select
            value={selectedBranchId}
            onValueChange={(v) => {
              setSelectedBranchId(v);
              setSelectedUserUid('all');
            }}
          >
            <SelectTrigger className="h-9 w-[180px] shrink-0 bg-white border-gray-200 text-foreground sm:w-[200px]">
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

          {reportsMode === 'org' ? (
            <Select value={effectiveOwnerUid} onValueChange={setSelectedUserUid}>
              <SelectTrigger className="h-9 w-[180px] shrink-0 bg-white border-gray-200 text-foreground sm:w-[200px]">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                <SelectItem value="all">All users</SelectItem>
                {reportingUsers.map((u) => {
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

          <Select
            value={selectedRegion || 'all'}
            onValueChange={(v) => setSelectedRegion(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-[180px] shrink-0 bg-white border-gray-200 text-foreground sm:w-[200px]">
              <SelectValue placeholder="All regions" />
            </SelectTrigger>
            <SelectContent className="z-[10001]">
              <SelectItem value="all">All regions</SelectItem>
              {uniqueRegions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedBusinessType || 'all'}
            onValueChange={(v) => setSelectedBusinessType(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-[190px] shrink-0 bg-white border-gray-200 text-foreground sm:w-[200px]">
              <SelectValue placeholder="All business types" />
            </SelectTrigger>
            <SelectContent className="z-[10001]">
              <SelectItem value="all">All business types</SelectItem>
              {uniqueBusinessTypes.map((bt) => (
                <SelectItem key={bt} value={bt}>
                  {bt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMethod} onValueChange={setSelectedMethod}>
            <SelectTrigger className="h-9 w-[170px] shrink-0 bg-white border-gray-200 text-foreground sm:w-[200px]">
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent className="z-[10001]">
              <SelectItem value="all">All methods</SelectItem>
              {METHOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex w-[150px] shrink-0 min-w-0 flex-nowrap items-center gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full bg-white border-gray-200 text-foreground gap-2 shrink-0 sm:w-auto"
              onClick={() => setSummaryOpen(true)}
            >
              <BarChart3 className="size-4" />
              Summary
            </Button>
          </div>
        </div>
      </div>

      <VisitsSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        visits={filteredVisits}
        isLoading={false}
        periodLabel={periodLabel}
      />

      {showVisitsSkeleton ? (
        <div className="space-y-8 py-2" aria-busy aria-label="Loading visit analytics">
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Skeleton className="h-[280px] w-full min-h-[200px] rounded-lg lg:col-span-1" />
            <Skeleton className="h-[280px] w-full min-h-[200px] rounded-lg lg:col-span-1" />
            <Skeleton className="h-[300px] w-full min-h-[200px] rounded-lg lg:col-span-2" />
          </div>
          <Skeleton className="h-[240px] w-full rounded-lg" />
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Duration summary
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <KpiCard
                label="Avg. visit duration per customer"
                value={
                  avgDurationPerCustomerKpi != null
                    ? formatMinutesRounded(avgDurationPerCustomerKpi)
                    : '—'
                }
                icon={Timer}
                iconClassName="text-sky-600"
              />
              <KpiCard
                label="Visits in range"
                value={String(filteredVisits.length)}
                icon={Clock}
                iconClassName="text-emerald-600"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Visits by user, branch, and region
            </h2>
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <ChartCard
                title="Visits per user"
                description="Top 5 reps by visit count"
              >
                {!hasVisits || visitsByUserBar.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <VisitsBreakdownBarChart data={visitsByUserBar} />
                )}
              </ChartCard>

              <ChartCard title="Visits per branch" description="Top 5 branches by label">
                {!hasVisits || visitsByBranchBar.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <VisitsBreakdownBarChart data={visitsByBranchBar} />
                )}
              </ChartCard>

              <ChartCard
                className="lg:col-span-2 w-full min-w-0"
                title="Visits per region"
                description="Top 10 regions from contact address"
              >
                {!hasVisits || visitsByRegionBar.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <VisitsRegionVerticalBarChart data={visitsByRegionBar} />
                )}
              </ChartCard>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Allocation</h2>
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <ChartCard
                title="Visits per user (share)"
                description="Top users + Other"
                icon={Users}
              >
                {!hasVisits || userShareDonut.slices.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ReportDonutChart
                    config={userShareDonut.config}
                    data={userShareDonut.slices}
                    centerPrimary={userShareDonut.sum.toLocaleString()}
                    centerSecondary="Visits in range"
                    className="max-h-[224px]"
                  />
                )}
              </ChartCard>

              <ChartCard
                title="Visits per customer"
                description="Top customers + Other"
                icon={Contact}
              >
                {!hasVisits || customerShareDonut.slices.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ReportDonutChart
                    config={customerShareDonut.config}
                    data={customerShareDonut.slices}
                    centerPrimary={customerShareDonut.sum.toLocaleString()}
                    centerSecondary="Visits in range"
                    className="max-h-[224px]"
                  />
                )}
              </ChartCard>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Time of day and customer duration
            </h2>
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <Card className="bg-white border-gray-200 min-w-0">
                <CardHeader>
                  <CardTitle>Visits by hour</CardTitle>
                  <CardDescription>
                    Check-in time in local timezone (0–23)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!hasVisits ? (
                    <EmptyChart />
                  ) : (
                    <ChartContainer
                      config={lineHourConfig}
                      className="aspect-auto h-[250px] w-full min-w-0"
                    >
                      <AreaChart
                        data={visitsByHourLine}
                        margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                      >
                        <defs>
                          <linearGradient
                            id="fillVisitsByHour"
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
                          dataKey="hour"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          interval={2}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          width={36}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <ChartLegend
                          content={<ChartLegendContent />}
                          verticalAlign="top"
                        />
                        <Area
                          type="natural"
                          dataKey="count"
                          name="Visits"
                          stroke="var(--color-count)"
                          strokeWidth={2}
                          fill="url(#fillVisitsByHour)"
                          dot={{ r: 4 }}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200 min-w-0">
                <CardHeader>
                  <CardTitle>Highest avg. duration per customer</CardTitle>
                  <CardDescription>
                    Completed visits only; average minutes per customer, then top
                    customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!hasVisits || avgDurationByCustomerBars.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ChartContainer
                      config={avgMinutesBarConfig}
                      className="aspect-auto h-[280px] w-full min-w-0"
                    >
                      <BarChart
                        data={avgDurationByCustomerBars}
                        accessibilityLayer
                        margin={{ left: 8, right: 8, top: 28, bottom: 48 }}
                        barCategoryGap="20%"
                        barGap={4}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          angle={-35}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={36}
                          label={{ value: 'min', angle: -90, position: 'insideLeft' }}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const raw = payload[0]?.value;
                            const minutes =
                              typeof raw === 'number'
                                ? raw
                                : Number.parseFloat(String(raw));
                            const title =
                              typeof label === 'string'
                                ? label
                                : label != null
                                  ? String(label)
                                  : '';
                            return (
                              <div className="border-border/50 bg-background grid min-w-[10rem] gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                                <div className="font-medium">{title}</div>
                                <div className="flex justify-between gap-4 font-mono tabular-nums">
                                  <span className="text-muted-foreground">
                                    Avg duration (min)
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {Number.isFinite(minutes)
                                      ? `${minutes} min`
                                      : String(raw)}
                                  </span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="minutes" radius={8}>
                          <LabelList
                            dataKey="minutes"
                            position="top"
                            offset={6}
                            className="fill-foreground text-[11px] font-medium"
                            formatter={(v: number) => `${v}`}
                          />
                          {avgDurationByCustomerBars.map((row) => (
                            <Cell key={row.name} fill={row.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Quotation value by rep
            </h2>
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle>Visits by quotation value per user</CardTitle>
                <CardDescription>
                  Top 5 reps by sum of sales values on visits (excl. zero)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!hasVisits || valueByUserBar.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No quotation values in this period.
                  </p>
                ) : (
                  <VisitsBreakdownBarChart
                    data={valueByUserBar}
                    config={valueByUserConfig}
                    valueTickFormatter={(v: number | string) =>
                      typeof v === 'number' && Number.isFinite(v)
                        ? v.toLocaleString()
                        : ''
                    }
                  />
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

type VisitsBreakdownBarRow = {
  name: string;
  value: number;
  fill: string;
  /** Full display name for tooltips when `name` is shortened (e.g. owner charts). */
  rawName?: string;
};

/** Vertical columns (bars upward); full-width region breakdown with readable X labels. */
function VisitsRegionVerticalBarChart({
  data,
}: {
  data: VisitsBreakdownBarRow[];
}) {
  return (
    <ChartContainer
      config={visitsBreakdownBarConfig}
      className="aspect-auto h-[320px] w-full min-w-0 [&_.recharts-responsive-container]:w-full"
    >
      <BarChart
        data={data}
        accessibilityLayer
        margin={{ left: 4, right: 12, top: 20, bottom: 8 }}
        barCategoryGap="6%"
        barGap={2}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          type="category"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10 }}
          height={88}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          type="number"
          tickLine={false}
          axisLine={false}
          width={36}
          allowDecimals={false}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            offset={6}
            className="fill-foreground text-[11px] font-medium"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function VisitsBreakdownBarChart({
  data,
  config = visitsBreakdownBarConfig,
  valueTickFormatter,
}: {
  data: VisitsBreakdownBarRow[];
  config?: ChartConfig;
  /** When set (e.g. currency), used for end-of-bar value labels. */
  valueTickFormatter?: (v: number | string) => string;
}) {
  const hasOwnerTooltip = data.some((d) => d.rawName != null);

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[240px] w-full min-w-0 [&_.recharts-responsive-container]:w-full"
    >
      <BarChart
        data={data}
        layout="vertical"
        accessibilityLayer
        margin={{ left: 4, right: 44, top: 4, bottom: 4 }}
        barCategoryGap="6%"
        barGap={2}
      >
        <XAxis
          type="number"
          dataKey="value"
          tick={false}
          axisLine={false}
          height={0}
          domain={[0, 'dataMax']}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={84}
          tickLine={false}
          tickMargin={4}
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => {
            const s = String(v);
            return s.length > 20 ? `${s.slice(0, 18)}…` : s;
          }}
        />
        <ChartTooltip
          cursor={false}
          content={
            hasOwnerTooltip ? (
              <ChartTooltipContent
                hideLabel
                className="min-w-[200px]"
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
                      {valueTickFormatter
                        ? valueTickFormatter(value as number | string)
                        : typeof value === 'number' && Number.isFinite(value)
                          ? value.toLocaleString()
                          : String(value ?? '')}
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
          {data.map((entry, index) => (
            <Cell
              key={`${entry.rawName ?? entry.name}-${index}`}
              fill={entry.fill}
            />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            offset={6}
            className="fill-foreground text-[11px]"
            formatter={
              valueTickFormatter
                ? (v: number | string) => valueTickFormatter(v)
                : (v: number | string) =>
                    typeof v === 'number' && Number.isFinite(v)
                      ? v.toLocaleString()
                      : String(v ?? '')
            }
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function ChartCard({
  title,
  description,
  children,
  icon: Icon,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <Card className={cn('min-w-0 bg-white border-gray-200', className)}>
      <CardHeader
        className={Icon ? 'flex flex-row items-start gap-2' : undefined}
      >
        {Icon ? (
          <>
            <Icon className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </>
        ) : (
          <>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <p className="text-center text-sm text-muted-foreground py-8">
      No visits in this period.
    </p>
  );
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
    <Card
      className={cn(
        'border border-gray-200 bg-white py-4 shadow-none',
        'gap-3'
      )}
    >
      <CardHeader className="pb-1 pt-0 gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn('size-5 shrink-0', iconClassName)} aria-hidden />
          <CardDescription className="leading-tight">{label}</CardDescription>
        </div>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
