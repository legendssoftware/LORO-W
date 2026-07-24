'use client';

import {
  useCallback,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { DateRange } from 'react-day-picker';
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
import { Briefcase, Clock, Contact, MapPinned, Timer, Users } from 'lucide-react';
import type { SyncProfile } from '@/api/types';
import type { BranchListItem } from '@/api/types/branch';
import { useBranches, useCheckIns, useUsers } from '@/api/hooks';
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
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { REPORT_CHART_HSL } from '@/app/reports/components/reports-chart-palette';
import {
  SearchableBranchPicker,
  SearchableOptionListPicker,
  SearchableUserPicker,
  reportsDateRangeCalendarProps,
  reportsDateRangePopoverContentClass,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
  type SearchableOptionRow,
} from '@/app/reports/components/reports-searchable-filter-comboboxes';
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
import type { ReportsMode } from '@/app/reports/reports-mode';
import {
  buildReportingUserUidSet,
  filterVisitExportItemsByReportingUserUids,
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
  utcRangeIsoFromUtcCalendarStoredRange,
  utcToday,
} from '@/app/reports/utils/overview-daily-summary';

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
  isActive?: boolean;
}

export function ReportsVisitsTab({
  profile,
  reportsMode,
  isActive = true,
}: ReportsVisitsTabProps) {
  const [startDate, setStartDate] = useState(() => {
    const { start } = utcMonthStartThroughToday();
    return start;
  });
  const [endDate, setEndDate] = useState(() => {
    const { end } = utcMonthStartThroughToday();
    return end;
  });
  const [dateRangePopoverOpen, setDateRangePopoverOpen] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [selectedUserUid, setSelectedUserUid] = useState('all');

  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedBusinessType, setSelectedBusinessType] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');

  const [draft, setDraft] = useState<DateRange | undefined>(() => {
    const r = utcMonthStartThroughToday();
    return { from: r.start, to: r.end };
  });

  const { startDate: startIso, endDate: endIso } =
    utcRangeIsoFromUtcCalendarStoredRange(startDate, endDate);

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
    { enabled: isActive }
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

  const regionPickerOptions = useMemo<SearchableOptionRow[]>(
    () =>
      uniqueRegions.map((r) => ({
        value: r,
        label: r,
        icon: <MapPinned className="size-4 shrink-0" />,
      })),
    [uniqueRegions]
  );

  const businessTypePickerOptions = useMemo<SearchableOptionRow[]>(
    () =>
      uniqueBusinessTypes.map((bt) => ({
        value: bt,
        label: bt,
        icon: <Briefcase className="size-4 shrink-0" />,
      })),
    [uniqueBusinessTypes]
  );

  const methodPickerOptions = useMemo<SearchableOptionRow[]>(
    () =>
      METHOD_OPTIONS.map((o) => {
        const Icon = o.icon;
        return {
          value: o.value,
          label: o.label,
          icon: <Icon className="size-4 shrink-0" size={16} />,
          searchExtra: o.value.toLowerCase(),
        };
      }),
    []
  );

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
      const h = d.getUTCHours();
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
              className={cn(
                reportsDateRangePopoverContentClass,
                reportsFilterPortalHighZ
              )}
              align="center"
            >
              <Calendar
                mode="range"
                {...reportsDateRangeCalendarProps}
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
                    to: r.to ? utcCalendarDateFromLocalPickerDate(r.to) : undefined,
                  });
                }}
                initialFocus
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

          <SearchableBranchPicker
            branches={branches as BranchListItem[]}
            selectedBranchId={selectedBranchId}
            onBranchChange={(v) => {
              setSelectedBranchId(v);
              setSelectedUserUid('all');
            }}
            triggerClassName="h-9 w-[180px] shrink-0 sm:min-w-[200px] sm:w-[200px]"
          />

          {reportsMode === 'org' ? (
            <SearchableUserPicker
              users={reportingUsers}
              branches={branches as BranchListItem[]}
              selectedUid={effectiveOwnerUid}
              onUidChange={setSelectedUserUid}
              triggerClassName="h-9 w-[180px] shrink-0 sm:min-w-[220px] sm:w-[220px]"
            />
          ) : null}

          <SearchableOptionListPicker
            selectedValue={selectedRegion || 'all'}
            onValueChange={(v) => setSelectedRegion(v === 'all' ? '' : v)}
            options={regionPickerOptions}
            placeholderLabelWhenAll="All regions"
            searchPlaceholder="Search regions…"
            emptyMessage="No region found."
            triggerIcon={<MapPinned className="size-4 shrink-0" />}
            triggerClassName="h-9 w-[180px] shrink-0 sm:w-[200px]"
          />

          <SearchableOptionListPicker
            selectedValue={selectedBusinessType || 'all'}
            onValueChange={(v) => setSelectedBusinessType(v === 'all' ? '' : v)}
            options={businessTypePickerOptions}
            placeholderLabelWhenAll="All business types"
            searchPlaceholder="Search business types…"
            emptyMessage="No business type found."
            triggerIcon={<Briefcase className="size-4 shrink-0" />}
            triggerClassName="h-9 w-[190px] shrink-0 sm:w-[200px]"
          />

          <SearchableOptionListPicker
            selectedValue={selectedMethod}
            onValueChange={setSelectedMethod}
            options={methodPickerOptions}
            placeholderLabelWhenAll="All methods"
            searchPlaceholder="Search methods…"
            emptyMessage="No method found."
            triggerClassName="h-9 w-[170px] shrink-0 sm:w-[200px]"
          />
        </div>
      </div>

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
              <Card className="bg-background border-border min-w-0">
                <CardHeader>
                  <CardTitle>Visits by hour</CardTitle>
                  <CardDescription>
                    Check-in time in UTC (0–23), aligned with Overview hourly trend
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

              <Card className="bg-background border-border min-w-0">
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
            <Card className="bg-background border-border">
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
    <Card className={cn('min-w-0 bg-background border-border', className)}>
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
        'border border-border bg-background py-4 shadow-none',
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
