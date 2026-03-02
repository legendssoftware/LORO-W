'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  ...['var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'].reduce(
    (acc, color, i) => ({ ...acc, [`method_${i}`]: { label: `Method ${i + 1}`, color } }),
    {} as ChartConfig
  ),
};

const VISITS_COUNT_CHART_CONFIG: ChartConfig = {
  count: { label: 'Visits', color: 'var(--chart-1)' },
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
      .slice(0, VISITS_CHART_TOP_N)
      .map(([name, count], i) => ({ name, count, fill: getChartColor(i) }));
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

  const durationByUserData = useMemo(() => {
    const totalMap = new Map<string, number>();
    const countMap = new Map<string, number>();
    for (const c of checkIns) {
      const mins = parseDurationToMinutes(c.duration);
      if (mins <= 0) continue;
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
      <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
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
    <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
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
                <ChartLegend content={<ChartLegendContent nameKey="name" maxItems={3} />} />
              </RechartsPieChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Contact method</div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visits by user</CardTitle>
          <CardDescription>Top {VISITS_CHART_TOP_N} users</CardDescription>
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
          <div className="text-muted-foreground leading-none">Average visit duration per user</div>
        </CardFooter>
      </Card>
    </div>
  );
}
