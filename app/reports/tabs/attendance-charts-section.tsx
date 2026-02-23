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
import type { MonthlyMetricsUserItem } from '@/api/types';
import { getChartColor, formatCompactValue } from '@/app/reports/chart-colors';
import { EXPECTED_MONTHLY_HOURS } from './constants';

/** Props for the shared attendance charts section. */
export interface AttendanceChartsSectionProps {
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  lateCount: number;
  onTimeCount: number;
  userMetrics: MonthlyMetricsUserItem[];
  totalHours: number;
  totalOvertimeHours: number;
  chartsLoading?: boolean;
}

const PRESENT_ABSENT_CHART_CONFIG: ChartConfig = {
  present: { label: 'Present', color: 'var(--chart-1)' },
  absent: { label: 'Absent', color: 'var(--chart-2)' },
  label: { color: 'var(--background)' },
};

function PresentAbsentPieChart({
  presentCount,
  absentCount,
  attendanceRate,
}: {
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}) {
  const data = [
    { name: 'present', value: presentCount, fill: getChartColor(0) },
    { name: 'absent', value: absentCount, fill: getChartColor(1) },
  ].filter((d) => d.value > 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Attendance – Present vs Absent</CardTitle>
        <CardDescription>Today&apos;s present vs absent</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No attendance data for today.
          </p>
        ) : (
          <ChartContainer
            config={PRESENT_ABSENT_CHART_CONFIG}
            className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px]"
          >
            <RechartsPieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
                cornerRadius={6}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
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
                            {attendanceRate}%
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
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </RechartsPieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="text-muted-foreground leading-none">
          Today&apos;s attendance
        </div>
      </CardFooter>
    </Card>
  );
}

const LATE_ON_TIME_CHART_CONFIG: ChartConfig = {
  late: { label: 'Late', color: 'var(--chart-1)' },
  onTime: { label: 'On-time', color: 'var(--chart-2)' },
  label: { color: 'var(--background)' },
};

function LateVsOnTimeBarChart({
  lateCount,
  onTimeCount,
}: {
  lateCount: number;
  onTimeCount: number;
}) {
  const data = [
    { name: 'Late', count: lateCount, fill: getChartColor(0) },
    { name: 'On-time', count: onTimeCount, fill: getChartColor(1) },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users – Late vs On-time</CardTitle>
        <CardDescription>Today</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={LATE_ON_TIME_CHART_CONFIG}
          className="aspect-auto h-[200px] sm:h-[250px] w-full"
        >
          <RechartsBarChart
            accessibilityLayer
            data={data}
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
              tickFormatter={(v) => v}
              hide
            />
            <XAxis dataKey="count" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent indicator="line" />
              }
            />
            <Bar
              dataKey="count"
              layout="vertical"
              radius={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="name"
                position="insideLeft"
                offset={8}
                className="fill-(--color-label)"
                fontSize={12}
              />
              <LabelList
                dataKey="count"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
            <ChartLegend
              content={
                <ChartLegendContent
                  nameKey="name"
                  payload={[
                    { value: 'Late', dataKey: 'late', color: getChartColor(0) },
                    { value: 'On-time', dataKey: 'onTime', color: getChartColor(1) },
                  ]}
                />
              }
            />
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="text-muted-foreground leading-none">
          Today&apos;s attendance
        </div>
      </CardFooter>
    </Card>
  );
}

const HOURS_TOP5_CHART_CONFIG: ChartConfig = {
  hours: { label: 'Hours', color: 'var(--chart-1)' },
  label: { color: 'var(--background)' },
};

function HoursTargetTop5Chart({
  userMetrics,
}: {
  userMetrics: MonthlyMetricsUserItem[];
}) {
  const data = useMemo(() => {
    const sorted = [...userMetrics].sort((a, b) => b.totalHours - a.totalHours);
    return sorted.slice(0, 5).map((u, i) => ({
      name: u.userName.length > 20 ? `${u.userName.slice(0, 17)}…` : u.userName,
      hours: Math.round(u.totalHours * 10) / 10,
      fill: getChartColor(i),
    }));
  }, [userMetrics]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hours target ({EXPECTED_MONTHLY_HOURS}h)</CardTitle>
          <CardDescription>Top 5 by hours this month</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            No monthly metrics yet.
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="text-muted-foreground leading-none">
            Hours target this month
          </div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours target ({EXPECTED_MONTHLY_HOURS}h)</CardTitle>
        <CardDescription>Top 5 by hours this month</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={HOURS_TOP5_CHART_CONFIG}
          className="aspect-auto h-[200px] sm:h-[250px] w-full"
        >
          <RechartsBarChart
            accessibilityLayer
            data={data}
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
            <XAxis dataKey="hours" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent nameKey="name" />}
            />
            <Bar dataKey="hours" layout="vertical" radius={4}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="hours"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
                formatter={(v: number) => `${v}h`}
              />
            </Bar>
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground leading-none">
          Hours target this month
        </div>
      </CardFooter>
    </Card>
  );
}

const OVERTIME_CHART_CONFIG: ChartConfig = {
  regular: { label: 'Regular hours', color: 'var(--chart-1)' },
  overtime: { label: 'Overtime hours', color: 'var(--chart-2)' },
};

function OvertimeVsRegularPieChart({
  totalHours,
  totalOvertimeHours,
}: {
  totalHours: number;
  totalOvertimeHours: number;
}) {
  const regularHours = Math.max(0, totalHours - totalOvertimeHours);
  const data = [
    { name: 'regular', value: regularHours, fill: getChartColor(0) },
    { name: 'overtime', value: totalOvertimeHours, fill: getChartColor(1) },
  ].filter((d) => d.value > 0);
  const total = totalHours;

  if (data.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Hours – Regular vs Overtime</CardTitle>
          <CardDescription>This month</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <p className="text-sm text-muted-foreground py-8 text-center">
            No hours data this month.
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="text-muted-foreground leading-none">
            This month&apos;s hours
          </div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Hours – Regular vs Overtime</CardTitle>
        <CardDescription>This month</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={OVERTIME_CHART_CONFIG}
          className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px]"
        >
          <RechartsPieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
              cornerRadius={6}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
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
                          {formatCompactValue(total, 'h')}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Total hours
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </RechartsPieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground leading-none">
          This month&apos;s hours
        </div>
      </CardFooter>
    </Card>
  );
}

/** Reusable 4-chart grid: Present vs Absent, Late vs On-time, Hours target top 5, Regular vs Overtime. */
export function AttendanceChartsSection({
  presentCount,
  absentCount,
  attendanceRate,
  lateCount,
  onTimeCount,
  userMetrics,
  totalHours,
  totalOvertimeHours,
  chartsLoading = false,
}: AttendanceChartsSectionProps) {
  if (chartsLoading) {
    return (
      <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28 mt-1" />
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
      <PresentAbsentPieChart
        presentCount={presentCount}
        absentCount={absentCount}
        attendanceRate={attendanceRate}
      />
      <LateVsOnTimeBarChart lateCount={lateCount} onTimeCount={onTimeCount} />
      <HoursTargetTop5Chart userMetrics={userMetrics} />
      <OvertimeVsRegularPieChart
        totalHours={totalHours}
        totalOvertimeHours={totalOvertimeHours}
      />
    </div>
  );
}
