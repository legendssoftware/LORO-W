'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import type { VisitExportItem } from '@/api/types/reports';
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

const VISITS_PER_MONTH_CHART_CONFIG: ChartConfig = {
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

/** Four charts: Methods of visits, Visits by user, Visits by region, Visit duration by user. */
export function VisitsChartsSection({
  checkIns,
  reportTotal,
  reportLoading,
}: {
  checkIns: VisitExportItem[];
  reportTotal?: number;
  reportLoading: boolean;
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
    const map = new Map<string, number>();
    for (const c of checkIns) {
      const branchName = c.branch?.name?.trim() ?? 'Not set';
      map.set(branchName, (map.get(branchName) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, VISITS_CHART_TOP_N)
      .map(([name, count], i) => ({ name, count, fill: getChartColor(i) }));
  }, [checkIns]);

  const visitsPerMonthData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of checkIns) {
      const monthKey = format(new Date(c.checkInTime), 'yyyy-MM');
      map.set(monthKey, (map.get(monthKey) ?? 0) + 1);
    }
    const year = new Date().getFullYear();
    const months: { date: string; visits: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${year}-${String(m).padStart(2, '0')}`;
      months.push({ date: monthKey, visits: map.get(monthKey) ?? 0 });
    }
    return months;
  }, [checkIns]);

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
        <CardContent className="space-y-4">
          {byBranchData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Visits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byBranchData.map((row, i) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.count.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Visits per branch</div>
        </CardFooter>
      </Card>

      {/* 3. Visits per month */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Visits per month</CardTitle>
          <CardDescription>Total visits by month</CardDescription>
        </CardHeader>
        <CardContent>
          {visitsPerMonthData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={VISITS_PER_MONTH_CHART_CONFIG}
              className="aspect-auto h-[200px] sm:h-[250px] w-full"
            >
              <AreaChart data={visitsPerMonthData}>
                <defs>
                  <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-visits)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-visits)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    const [y, m] = value.split('-');
                    return format(new Date(parseInt(y, 10), parseInt(m, 10) - 1), 'MMM');
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        const [y, m] = String(value).split('-');
                        return format(new Date(parseInt(y, 10), parseInt(m, 10) - 1), 'MMMM yyyy');
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
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Monthly visit trend</div>
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
