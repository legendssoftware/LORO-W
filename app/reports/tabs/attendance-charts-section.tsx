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
import type { ClockInOptionKey, DailyOverviewUser } from '@/api/types/attendance';
import { getChartColor, formatCompactValue } from '@/app/reports/chart-colors';
import { OPTION_KEY_TO_LABEL, clockInModeKeyForFilter } from '@/lib/clock-in-options';

const PRESENT_ABSENT_CHART_CONFIG: ChartConfig = {
  value: { label: 'Count', color: 'var(--chart-1)' },
  present: { label: 'Present', color: 'var(--chart-1)' },
  absent: { label: 'Absent', color: 'var(--chart-2)' },
};

const COUNT_CHART_CONFIG: ChartConfig = {
  count: { label: 'Count', color: 'var(--chart-1)' },
};

function workModeLabel(
  u: DailyOverviewUser,
  branchLocationRadiusMeters: number
): string {
  const key = clockInModeKeyForFilter(
    true,
    u.checkInNotes,
    u.distanceFromWorkplaceMeters,
    branchLocationRadiusMeters
  );
  if (key) return OPTION_KEY_TO_LABEL[key];
  const raw = u.checkInNotes?.trim();
  if (raw) return raw;
  return 'Not set';
}

export interface AttendanceChartsSectionProps {
  filteredPresentUsers: DailyOverviewUser[];
  filteredAbsentUsers: DailyOverviewUser[];
  branchLocationRadiusMeters: number;
  chartsLoading: boolean;
}

export function AttendanceChartsSection({
  filteredPresentUsers,
  filteredAbsentUsers,
  branchLocationRadiusMeters,
  chartsLoading,
}: AttendanceChartsSectionProps) {
  const presentCount = filteredPresentUsers.length;
  const absentCount = filteredAbsentUsers.length;
  const totalHeadcount = presentCount + absentCount;
  const attendanceRate =
    totalHeadcount > 0 ? Math.round((presentCount / totalHeadcount) * 100) : 0;

  const presentVsAbsentData = useMemo(() => {
    if (presentCount === 0 && absentCount === 0) return [];
    return [
      { name: 'Present', value: presentCount, fill: getChartColor(0) },
      { name: 'Absent', value: absentCount, fill: getChartColor(1) },
    ].filter((d) => d.value > 0);
  }, [presentCount, absentCount]);

  const distanceStats = useMemo(() => {
    const radius = branchLocationRadiusMeters;
    let within = 0;
    let beyond = 0;
    let unknown = 0;
    for (const u of filteredPresentUsers) {
      const d = u.distanceFromWorkplaceMeters;
      if (d == null || !Number.isFinite(d)) {
        unknown += 1;
        continue;
      }
      if (d <= radius) within += 1;
      else beyond += 1;
    }
    return { within, beyond, unknown };
  }, [filteredPresentUsers, branchLocationRadiusMeters]);

  const distanceBucketData = useMemo(() => {
    const rows = [
      { name: 'Within radius', count: distanceStats.within, fill: getChartColor(0) },
      { name: 'Beyond radius', count: distanceStats.beyond, fill: getChartColor(1) },
      { name: 'No GPS', count: distanceStats.unknown, fill: getChartColor(2) },
    ].filter((r) => r.count > 0);
    return rows;
  }, [distanceStats]);

  const workModesData = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of filteredPresentUsers) {
      const label = workModeLabel(u, branchLocationRadiusMeters);
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count], i) => ({ name, count, fill: getChartColor(i % 7) }));
  }, [filteredPresentUsers, branchLocationRadiusMeters]);

  if (chartsLoading && totalHeadcount === 0) {
    return (
      <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
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
        <h3 className="text-lg font-semibold text-foreground">Attendance Overview</h3>
        <p className="text-sm text-muted-foreground">Selected day (end of date range)</p>
      </div>

      {/* 1. Present vs absent */}
      <Card>
        <CardHeader>
          <CardTitle>Present vs absent</CardTitle>
          <CardDescription>Filtered employees for the selected day</CardDescription>
        </CardHeader>
        <CardContent>
          {presentVsAbsentData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={PRESENT_ABSENT_CHART_CONFIG}
              className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px]"
            >
              <RechartsPieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={presentVsAbsentData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                  cornerRadius={6}
                  paddingAngle={2}
                >
                  {presentVsAbsentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
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
                              {`${attendanceRate}%`}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy ?? 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Attendance rate
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" maxItems={2} />} />
              </RechartsPieChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">
            {formatCompactValue(presentCount)} present · {formatCompactValue(absentCount)} absent ·{' '}
            {formatCompactValue(totalHeadcount)} total
          </div>
        </CardFooter>
      </Card>

      {/* 2. Avg clock-in distance + buckets */}
      <Card>
        <CardHeader>
          <CardTitle>Avg clock-in distance</CardTitle>
          <CardDescription>
            Present with GPS: average distance from office ({branchLocationRadiusMeters}m radius)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {distanceBucketData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No present rows to chart</p>
          ) : (
            <ChartContainer config={COUNT_CHART_CONFIG} className="aspect-auto h-[160px] w-full">
              <RechartsBarChart
                accessibilityLayer
                data={distanceBucketData}
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
                  {distanceBucketData.map((entry, i) => (
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
          <div className="text-muted-foreground leading-none">Within vs beyond branch radius</div>
        </CardFooter>
      </Card>

      {/* 3. Work modes */}
      <Card>
        <CardHeader>
          <CardTitle>Work modes</CardTitle>
          <CardDescription>Across filtered present employees</CardDescription>
        </CardHeader>
        <CardContent>
          {workModesData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer config={COUNT_CHART_CONFIG} className="aspect-auto h-[200px] sm:h-[250px] w-full">
              <RechartsBarChart
                accessibilityLayer
                data={workModesData}
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
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <XAxis dataKey="count" type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                <Bar dataKey="count" layout="vertical" radius={4}>
                  {workModesData.map((entry, i) => (
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
          <div className="text-muted-foreground leading-none">Resolved mode (notes + distance)</div>
        </CardFooter>
      </Card>
    </div>
  );
}
