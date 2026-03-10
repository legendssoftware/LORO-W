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
import { getChartColor, formatCompactValue } from '@/app/reports/chart-colors';
import type { AttendanceReportOrganizationMetrics } from '@/api/types/attendance';
import type { MonthlyMetricsUserItem } from '@/api/types/attendance';

const ATTENDANCE_COUNT_CHART_CONFIG: ChartConfig = {
  count: { label: 'Count', color: 'var(--chart-1)' },
};

const ATTENDANCE_HOURS_CHART_CONFIG: ChartConfig = {
  totalHours: { label: 'Hours', color: 'var(--chart-1)' },
};

const ATTENDANCE_PIE_CHART_CONFIG: ChartConfig = {
  value: { label: 'Hours', color: 'var(--chart-1)' },
  ...['var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)'].reduce(
    (acc, color, i) => ({ ...acc, [`slice_${i}`]: { label: `User ${i + 1}`, color } }),
    {} as ChartConfig
  ),
};

const ATTENDANCE_CHART_TOP_N = 5;

export interface AttendanceChartsSectionProps {
  attendanceRate: number;
  reportPeriod?: { from: string; to: string; totalDays?: number };
  organizationMetrics?: AttendanceReportOrganizationMetrics | null;
  monthlySummary?: { totalShifts: number; totalHours: number; totalUsers: number };
  monthlyUserMetrics?: MonthlyMetricsUserItem[];
  chartsLoading: boolean;
}

export function AttendanceChartsSection({
  attendanceRate: _attendanceRate,
  reportPeriod: _reportPeriod,
  organizationMetrics,
  monthlySummary,
  monthlyUserMetrics = [],
  chartsLoading,
}: AttendanceChartsSectionProps) {
  const totalHours = organizationMetrics?.totals?.totalHours ?? 0;
  const totalShifts = organizationMetrics?.totals?.totalShifts ?? 0;

  const overviewPieData = useMemo(() => {
    const items: { name: string; value: number; fill: string }[] = [];
    if (totalHours > 0) items.push({ name: 'Total hours', value: totalHours, fill: getChartColor(0) });
    if (totalShifts > 0) items.push({ name: 'Total shifts', value: totalShifts, fill: getChartColor(1) });
    return items;
  }, [totalHours, totalShifts]);

  const hoursByUserData = useMemo(() => {
    return [...monthlyUserMetrics]
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, ATTENDANCE_CHART_TOP_N)
      .map((u, i) => ({
        name: u.userName?.trim() || `User ${u.userId}`,
        totalHours: Math.round(u.totalHours * 10) / 10,
        fill: getChartColor(i),
      }));
  }, [monthlyUserMetrics]);

  const shiftsByUserData = useMemo(() => {
    return [...monthlyUserMetrics]
      .sort((a, b) => b.totalShifts - a.totalShifts)
      .slice(0, ATTENDANCE_CHART_TOP_N)
      .map((u, i) => ({
        name: u.userName?.trim() || `User ${u.userId}`,
        totalShifts: u.totalShifts,
        fill: getChartColor(i),
      }));
  }, [monthlyUserMetrics]);

  const hoursAllocationData = useMemo(() => {
    return monthlyUserMetrics
      .filter((u) => u.totalHours > 0)
      .map((u, i) => ({
        name: (u.userName?.trim() || `User ${u.userId}`).length > 18
          ? `${(u.userName?.trim() || `User ${u.userId}`).slice(0, 15)}…`
          : (u.userName?.trim() || `User ${u.userId}`),
        value: Math.round(u.totalHours * 10) / 10,
        fill: getChartColor(i % 7),
      }));
  }, [monthlyUserMetrics]);

  if (chartsLoading) {
    return (
      <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
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
      </div>

      {/* 1. Overview: total hours / shifts in period (pie with total in center) */}
      <Card>
        <CardHeader>
          <CardTitle>Total hours in period</CardTitle>
          <CardDescription>Hours and shifts from report period</CardDescription>
        </CardHeader>
        <CardContent>
          {totalHours === 0 && totalShifts === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={ATTENDANCE_PIE_CHART_CONFIG}
              className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px]"
            >
              <RechartsPieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={overviewPieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                  cornerRadius={6}
                  paddingAngle={2}
                >
                  {overviewPieData.map((entry, index) => (
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
                              {formatCompactValue(totalHours, 'h')}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy ?? 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Hours · {totalShifts} shifts
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
          <div className="text-muted-foreground leading-none">Report period totals</div>
        </CardFooter>
      </Card>

      <div className="col-span-full space-y-2">
        <Separator />
        <h3 className="text-lg font-semibold text-foreground">User activity</h3>
      </div>

      {/* 2. Hours by user (horizontal bar, top N) */}
      <Card>
        <CardHeader>
          <CardTitle>Hours by user</CardTitle>
          <CardDescription>Top {ATTENDANCE_CHART_TOP_N} by hours (month)</CardDescription>
        </CardHeader>
        <CardContent>
          {hoursByUserData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={ATTENDANCE_HOURS_CHART_CONFIG}
              className="aspect-auto h-[200px] sm:h-[250px] w-full"
            >
              <RechartsBarChart
                accessibilityLayer
                data={hoursByUserData}
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
                <XAxis dataKey="totalHours" type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                <Bar dataKey="totalHours" layout="vertical" radius={4}>
                  {hoursByUserData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="totalHours"
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
          <div className="text-muted-foreground leading-none">Hours per user (selected month)</div>
        </CardFooter>
      </Card>

      {/* 3. Shifts by user (horizontal bar, top N) */}
      <Card>
        <CardHeader>
          <CardTitle>Shifts by user</CardTitle>
          <CardDescription>Top {ATTENDANCE_CHART_TOP_N} by shift count (month)</CardDescription>
        </CardHeader>
        <CardContent>
          {shiftsByUserData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={ATTENDANCE_COUNT_CHART_CONFIG}
              className="aspect-auto h-[200px] sm:h-[250px] w-full"
            >
              <RechartsBarChart
                accessibilityLayer
                data={shiftsByUserData}
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
                <XAxis dataKey="totalShifts" type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                <Bar dataKey="totalShifts" layout="vertical" radius={4}>
                  {shiftsByUserData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="totalShifts"
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
          <div className="text-muted-foreground leading-none">Shifts per user (selected month)</div>
        </CardFooter>
      </Card>

      {/* 4. Hours allocation (pie by user) */}
      <Card>
        <CardHeader>
          <CardTitle>Hours allocation</CardTitle>
          <CardDescription>Share of hours by user (month)</CardDescription>
        </CardHeader>
        <CardContent>
          {hoursAllocationData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={ATTENDANCE_PIE_CHART_CONFIG}
              className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px]"
            >
              <RechartsPieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                <Pie
                  data={hoursAllocationData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                  cornerRadius={6}
                  paddingAngle={2}
                >
                  {hoursAllocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" maxItems={3} />} />
              </RechartsPieChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Share of hours by user (selected month)</div>
        </CardFooter>
      </Card>
    </div>
  );
}
