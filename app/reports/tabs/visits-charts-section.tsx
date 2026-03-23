'use client';

import { useMemo } from 'react';
import { endOfDay, format, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Label,
  LabelList,
  CartesianGrid,
} from 'recharts';
import type { BranchListItem } from '@/api/types/branch';
import type { VisitExportItem } from '@/api/types/reports';
import {
  getVisitBranchUid,
  resolveBranchChartLabel,
} from '@/lib/utils/visits-export';
import { getChartColor, formatCompactValue } from '@/app/reports/chart-colors';

const VISITS_METHOD_CHART_CONFIG: ChartConfig = {
  count: { label: 'Visits', color: 'var(--chart-1)' },
  ...['var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)'].reduce(
    (acc, color, i) => ({ ...acc, [`method_${i}`]: { label: `Method ${i + 1}`, color } }),
    {} as ChartConfig
  ),
};

const VISITS_COUNT_CHART_CONFIG: ChartConfig = {
  count: { label: 'Visits', color: 'var(--chart-1)' },
};

const VISITS_PER_HOUR_CHART_CONFIG: ChartConfig = {
  visits: { label: 'Visits', color: 'var(--chart-1)' },
};

export function parseDurationToMinutes(duration: string | null | undefined): number {
  if (!duration || typeof duration !== 'string') return 0;
  const hoursMatch = duration.match(/(\d+)h/);
  const minutesMatch = duration.match(/(\d+)m/);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  return hours * 60 + minutes;
}

export function formatMinutesToDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function normalizeDurationDisplay(duration: string | null | undefined): string {
  if (duration == null || duration === '') return '-';
  const mins = parseDurationToMinutes(duration);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

/** Format owner name as "Initial Surname" (e.g. "J Bouwer", "J Diviani"). */
function formatNameAsInitialSurname(
  firstName: string | null | undefined,
  surname: string | null | undefined
): string {
  const first = (firstName ?? '').trim();
  const last = (surname ?? '').trim();
  if (!first && !last) return 'Unknown';
  const initial = first.charAt(0).toUpperCase();
  return last ? `${initial} ${last}` : (initial || first);
}

/** Format building type for display (e.g. office -> Office, residential-apartment -> Residential apartment). */
function formatBuildingType(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return 'Not set';
  return value
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Extract region string from a visit (for charts and region filter). */
export function extractRegionFromVisit(c: VisitExportItem): string {
  const addr = c.fullAddress ?? c.checkOutFullAddress ?? c.contactAddress;
  if (!addr) return 'Not set';
  const cityOrRegion = (addr.city ?? addr.state ?? '').trim();
  const postalCode = addr.postalCode?.trim() ?? '';
  const country = (addr.country ?? '').trim();
  const fromStructured = [cityOrRegion, postalCode, country].filter(Boolean).join(', ');
  if (fromStructured) return fromStructured;
  const formatted = (addr.formattedAddress ?? '').trim();
  if (!formatted) return 'Not set';
  const parts = formatted.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return 'Not set';
  const secondLast = parts[parts.length - 2];
  const codePart = /^\d{4,5}$/.test(secondLast) ? secondLast : '';
  const cityPart = codePart ? parts[parts.length - 3] ?? '' : secondLast;
  const countryPart = parts[parts.length - 1];
  return [cityPart, codePart, countryPart].filter(Boolean).join(', ') || 'Not set';
}

const VISITS_CHART_TOP_N = 5;
const VISITS_BY_USER_TOP_N = 5;

/** Visits-by-hour chart: show 6:00–18:00 only (6am–6pm). */
const BUSINESS_DAY_START_HOUR = 6;
const BUSINESS_DAY_END_HOUR = 18;
const VISITS_PER_HOUR_TICKS = [6, 9, 12, 15, 18] as const;

/** Four charts: Methods of visits, Visits by user, Visits by region, Visit duration by user. */
export function VisitsChartsSection({
  checkIns,
  checkInsTodayForHourly,
  reportTotal,
  reportLoading,
  branches = [],
}: {
  checkIns: VisitExportItem[];
  checkInsTodayForHourly: VisitExportItem[];
  reportTotal?: number;
  reportLoading: boolean;
  /** Org branch list (GET /branch) for canonical labels on the visits-by-branch chart. */
  branches?: BranchListItem[];
}) {
  const totalVisits = reportTotal ?? checkIns.length;

  const byMethodData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of checkIns) {
      const key = c.methodOfContact || 'Not set';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value], i) => ({
      name,
      value,
      fill: getChartColor(i),
    }));
  }, [checkIns]);

  const byUserData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of checkIns) {
      const name =
        c.owner?.name != null
          ? [c.owner.name, (c.owner as { surname?: string }).surname].filter(Boolean).join(' ').trim()
          : 'Unknown';
      const displayName = name.length > 18 ? `${name.slice(0, 15)}…` : name;
      map.set(displayName, (map.get(displayName) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, VISITS_BY_USER_TOP_N)
      .map(([name, count], i) => ({ name, count, fill: getChartColor(i % 7) }));
  }, [checkIns]);

  const visitAllocationData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of checkIns) {
      const owner = c.owner as { name?: string; surname?: string } | undefined;
      const displayName = formatNameAsInitialSurname(owner?.name, owner?.surname);
      map.set(displayName, (map.get(displayName) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => ({ name, count, fill: getChartColor(i % 7) }));
  }, [checkIns]);

  const byRegionData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of checkIns) {
      const region = extractRegionFromVisit(c);
      map.set(region, (map.get(region) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, VISITS_CHART_TOP_N)
      .map(([name, count], i) => ({ name, count, fill: getChartColor(i) }));
  }, [checkIns]);

  const byBranchData = useMemo(() => {
    const map = new Map<number | string, { label: string; count: number }>();
    for (const c of checkIns) {
      const uid = getVisitBranchUid(c);
      const label = resolveBranchChartLabel(c, branches);
      const key = uid != null ? uid : label;
      const prev = map.get(key);
      if (prev) prev.count += 1;
      else map.set(key, { label, count: 1 });
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, VISITS_CHART_TOP_N)
      .map((row, i) => ({
        name: row.label,
        count: row.count,
        fill: getChartColor(i),
      }));
  }, [checkIns, branches]);

  const visitsPerHourTodayData = useMemo(() => {
    const dayStart = startOfDay(new Date());
    const dayEnd = endOfDay(new Date());
    const counts = new Array(24).fill(0) as number[];
    for (const c of checkInsTodayForHourly) {
      const t = parseISO(c.checkInTime);
      if (!isWithinInterval(t, { start: dayStart, end: dayEnd })) continue;
      counts[t.getHours()] += 1;
    }
    return counts
      .map((visits, hour) => ({ hour, visits }))
      .filter(
        (row) =>
          row.hour >= BUSINESS_DAY_START_HOUR && row.hour <= BUSINESS_DAY_END_HOUR
      );
  }, [checkInsTodayForHourly]);

  const byCustomerData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of checkIns) {
      const key = (c.companyName?.trim() || 'Not set');
      const displayName = key.length > 18 ? `${key.slice(0, 15)}…` : key;
      map.set(displayName, (map.get(displayName) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, VISITS_CHART_TOP_N)
      .map(([name, count], i) => ({ name, count, fill: getChartColor(i) }));
  }, [checkIns]);

  const bySiteTypeData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of checkIns) {
      const key = formatBuildingType(c.buildingType ?? null);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, VISITS_CHART_TOP_N)
      .map(([name, count], i) => ({ name, count, fill: getChartColor(i) }));
  }, [checkIns]);

  const visitToLeadData = useMemo(() => {
    let withLead = 0;
    let withoutLead = 0;
    for (const c of checkIns) {
      if (c.lead != null) withLead++;
      else withoutLead++;
    }
    return [
      { name: 'Converted to lead', value: withLead, fill: getChartColor(0) },
      { name: 'No lead', value: withoutLead, fill: getChartColor(1) },
    ].filter((d) => d.value > 0);
  }, [checkIns]);

  const durationByUserData = useMemo(() => {
    const totalMap = new Map<string, number>();
    const countMap = new Map<string, number>();
    for (const c of checkIns) {
      const mins = parseDurationToMinutes(c.duration);
      if (mins <= 0 || mins > 60) continue;
      const name =
        c.owner?.name != null
          ? [c.owner.name, (c.owner as { surname?: string }).surname].filter(Boolean).join(' ').trim()
          : 'Unknown';
      const displayName = name.length > 18 ? `${name.slice(0, 15)}…` : name;
      totalMap.set(displayName, (totalMap.get(displayName) ?? 0) + mins);
      countMap.set(displayName, (countMap.get(displayName) ?? 0) + 1);
    }
    return Array.from(totalMap.entries())
      .map(([name, totalMinutes]) => {
        const visitCount = countMap.get(name) ?? 1;
        const averageMinutes = Math.round(totalMinutes / visitCount);
        return { name, averageMinutes, visitCount };
      })
      .filter(({ averageMinutes }) => averageMinutes > 0)
      .sort((a, b) => b.averageMinutes - a.averageMinutes)
      .slice(0, VISITS_CHART_TOP_N)
      .map(({ name, averageMinutes }, i) => ({
        name,
        averageMinutes,
        displayDuration: formatMinutesToDuration(averageMinutes),
        fill: getChartColor(i),
      }));
  }, [checkIns]);

  if (reportLoading && checkIns.length === 0) {
    return (
      <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] sm:h-[250px] w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <div className="col-span-full">
        <h3 className="text-lg font-semibold text-foreground">Visit Overview</h3>
      </div>
      {/* 1. Methods of visits */}
      <Card>
        <CardHeader>
          <CardTitle>Methods of visits</CardTitle>
          <CardDescription>Total visits in center</CardDescription>
        </CardHeader>
        <CardContent>
          {byMethodData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={VISITS_METHOD_CHART_CONFIG}
              className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px]"
            >
              <RechartsPieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={byMethodData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                  cornerRadius={6}
                  paddingAngle={2}
                >
                  {byMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (
                        viewBox &&
                        'cx' in viewBox &&
                        'cy' in viewBox
                      ) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {formatCompactValue(totalVisits)}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy ?? 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Visits
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" maxItems={3} itemClassName="text-[10px]" />}
                />
              </RechartsPieChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Contact method</div>
        </CardFooter>
      </Card>

      {/* 2. Visits by region */}
      <Card>
        <CardHeader>
          <CardTitle>Visits by region</CardTitle>
          <CardDescription>Top {VISITS_CHART_TOP_N} regions</CardDescription>
        </CardHeader>
        <CardContent>
          {byRegionData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={VISITS_COUNT_CHART_CONFIG}
              className="aspect-auto h-[200px] sm:h-[250px] w-full"
            >
              <RechartsBarChart
                accessibilityLayer
                data={byRegionData}
                layout="vertical"
                margin={{ right: 16 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <XAxis dataKey="count" type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                <Bar dataKey="count" layout="vertical" radius={4}>
                  {byRegionData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                  />
                </Bar>
              </RechartsBarChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Visits per region</div>
        </CardFooter>
      </Card>

      {/* 2b. Visits by branch */}
      <Card>
        <CardHeader>
          <CardTitle>Visits by branch</CardTitle>
          <CardDescription>Top {VISITS_CHART_TOP_N} branches</CardDescription>
        </CardHeader>
        <CardContent>
          {byBranchData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={VISITS_COUNT_CHART_CONFIG}
              className="aspect-auto h-[200px] sm:h-[250px] w-full"
            >
              <RechartsBarChart
                accessibilityLayer
                data={byBranchData}
                layout="vertical"
                margin={{ right: 16 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <XAxis dataKey="count" type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                <Bar dataKey="count" layout="vertical" radius={4}>
                  {byBranchData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                  />
                </Bar>
              </RechartsBarChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Visits per branch</div>
        </CardFooter>
      </Card>

      {/* 3. Visits by hour (today) */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Visits by hour</CardTitle>
          <CardDescription>Total visits today by hour of day</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={VISITS_PER_HOUR_CHART_CONFIG}
            className="aspect-auto h-[200px] sm:h-[250px] w-full"
          >
            <AreaChart data={visitsPerHourTodayData}>
              <defs>
                <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-visits)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-visits)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="hour"
                type="number"
                domain={[BUSINESS_DAY_START_HOUR, BUSINESS_DAY_END_HOUR]}
                ticks={[...VISITS_PER_HOUR_TICKS]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  const h = Number(value);
                  if (!Number.isFinite(h)) return '';
                  return `${String(h).padStart(2, '0')}:00`;
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label, payload) => {
                      const fromPayload = payload?.[0]?.payload as
                        | { hour?: number }
                        | undefined;
                      const raw =
                        label !== undefined && label !== null && label !== ''
                          ? Number(label)
                          : fromPayload?.hour;
                      const h = Number(raw);
                      if (!Number.isFinite(h) || h < 0 || h > 23) {
                        return String(label ?? '');
                      }
                      const d = new Date();
                      d.setHours(h, 0, 0, 0);
                      return format(d, 'HH:mm');
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="visits"
                type="natural"
                fill="url(#fillVisits)"
                stroke="var(--color-visits)"
                dot={{ r: 4 }}
              >
                <LabelList
                  dataKey="visits"
                  position="top"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Area>
            </AreaChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Today&apos;s visit trend by hour</div>
        </CardFooter>
      </Card>

      <div className="col-span-full space-y-2">
        <Separator />
        <h3 className="text-lg font-semibold text-foreground">User & Site Activity</h3>
      </div>
      {/* 4. Visit duration by user (excludes visits over 1 hour) */}
      <Card>
        <CardHeader>
          <CardTitle>Visit duration by user</CardTitle>
          <CardDescription>Top {VISITS_CHART_TOP_N} by average duration</CardDescription>
        </CardHeader>
        <CardContent>
          {durationByUserData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={VISITS_COUNT_CHART_CONFIG}
              className="aspect-auto h-[200px] sm:h-[250px] w-full"
            >
              <RechartsBarChart
                accessibilityLayer
                data={durationByUserData}
                layout="vertical"
                margin={{ right: 16 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <XAxis dataKey="averageMinutes" type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      nameKey="name"
                      formatter={(value, _name, _item, _index, payload) => [
                        (payload as { displayDuration?: string } | undefined)?.displayDuration ?? formatMinutesToDuration(Number(value)),
                        'Duration',
                      ]}
                    />
                  }
                />
                <Bar dataKey="averageMinutes" layout="vertical" radius={4}>
                  {durationByUserData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="displayDuration"
                    position="right"
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                  />
                </Bar>
              </RechartsBarChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Average visit duration per user (excludes visits over 1 hour)</div>
        </CardFooter>
      </Card>

      {/* 5. Visits by site type */}
      <Card>
        <CardHeader>
          <CardTitle>Visits by site type</CardTitle>
          <CardDescription>Top {VISITS_CHART_TOP_N} building types</CardDescription>
        </CardHeader>
        <CardContent>
          {bySiteTypeData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={VISITS_COUNT_CHART_CONFIG}
              className="aspect-auto h-[200px] sm:h-[250px] w-full"
            >
              <RechartsBarChart
                accessibilityLayer
                data={bySiteTypeData}
                layout="vertical"
                margin={{ right: 16 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <XAxis dataKey="count" type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                <Bar dataKey="count" layout="vertical" radius={4}>
                  {bySiteTypeData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                  />
                </Bar>
              </RechartsBarChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Building type</div>
        </CardFooter>
      </Card>

      {/* 6. Visits by user – horizontal bars, top 5 */}
      <Card>
        <CardHeader>
          <CardTitle>Visits by user</CardTitle>
          <CardDescription>Top {VISITS_BY_USER_TOP_N} users</CardDescription>
        </CardHeader>
        <CardContent>
          {byUserData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={VISITS_COUNT_CHART_CONFIG}
              className="aspect-auto h-[200px] sm:h-[250px] w-full"
            >
              <RechartsBarChart
                accessibilityLayer
                data={byUserData}
                layout="vertical"
                margin={{ right: 16 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <XAxis dataKey="count" type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                <Bar dataKey="count" layout="vertical" radius={4}>
                  {byUserData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                  />
                </Bar>
              </RechartsBarChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Visits per user</div>
        </CardFooter>
      </Card>

      <div className="col-span-full space-y-2">
        <Separator />
        <h3 className="text-lg font-semibold text-foreground">Customer & Conversion</h3>
      </div>
      {/* 7. Visit allocation – pie chart by user (all users) */}
      <Card>
        <CardHeader>
          <CardTitle>Visit allocation</CardTitle>
          <CardDescription>Visits per user</CardDescription>
        </CardHeader>
        <CardContent>
          {visitAllocationData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={VISITS_METHOD_CHART_CONFIG}
              className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px]"
            >
              <RechartsPieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                <Pie
                  data={visitAllocationData}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                  cornerRadius={6}
                  paddingAngle={2}
                >
                  {visitAllocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" maxItems={3} itemClassName="text-[10px]" />}
                />
              </RechartsPieChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Share of visits by user</div>
        </CardFooter>
      </Card>

      {/* 8. Visits by customer (company) */}
      <Card>
        <CardHeader>
          <CardTitle>Visits by customer</CardTitle>
          <CardDescription>Top {VISITS_CHART_TOP_N} companies</CardDescription>
        </CardHeader>
        <CardContent>
          {byCustomerData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={VISITS_COUNT_CHART_CONFIG}
              className="aspect-auto h-[200px] sm:h-[250px] w-full"
            >
              <RechartsBarChart
                accessibilityLayer
                data={byCustomerData}
                layout="vertical"
                margin={{ right: 16 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <XAxis dataKey="count" type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                <Bar dataKey="count" layout="vertical" radius={4}>
                  {byCustomerData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                  />
                </Bar>
              </RechartsBarChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Visits per company</div>
        </CardFooter>
      </Card>

      {/* 9. Visit-to-lead conversion */}
      <Card>
        <CardHeader>
          <CardTitle>Visit-to-lead conversion</CardTitle>
          <CardDescription>
            {totalVisits > 0
              ? `${Math.round((visitToLeadData.find((d) => d.name === 'Converted to lead')?.value ?? 0) / totalVisits * 100)}% converted`
              : 'Visits with linked leads'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visitToLeadData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={VISITS_METHOD_CHART_CONFIG}
              className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px]"
            >
              <RechartsPieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={visitToLeadData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                  cornerRadius={6}
                  paddingAngle={2}
                >
                  {visitToLeadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" maxItems={2} itemClassName="text-[10px]" />}
                />
              </RechartsPieChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Visits linked to leads</div>
        </CardFooter>
      </Card>
    </div>
  );
}
