'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Label,
} from 'recharts';
import { getChartColor, formatCompactValue } from '@/app/reports/chart-colors';
import { EXPECTED_HOURS_PER_DAY, workingDaysInMonth } from '@/app/reports/tabs/constants';
import type { AttendanceReportOrganizationMetrics } from '@/api/types/attendance';
import type { MonthlyMetricsUserItem } from '@/api/types/attendance';

const PRESENT_ABSENT_CHART_CONFIG: ChartConfig = {
  value: { label: 'Count', color: 'var(--chart-1)' },
  present: { label: 'Present', color: 'var(--chart-1)' },
  absent: { label: 'Absent', color: 'var(--chart-2)' },
};

const ON_TRACK_CHART_CONFIG: ChartConfig = {
  value: { label: 'Employees', color: 'var(--chart-1)' },
  onTrack: { label: 'On track', color: 'var(--chart-1)' },
  behind: { label: 'Behind', color: 'var(--chart-2)' },
};

export interface DailyOverviewSummary {
  date: string;
  presentEmployees: number;
  absentEmployees: number;
  attendanceRate: number;
  totalEmployees: number;
}

export interface AttendanceChartsSectionProps {
  attendanceRate: number;
  reportPeriod?: { from: string; to: string; totalDays?: number };
  organizationMetrics?: AttendanceReportOrganizationMetrics | null;
  monthlySummary?: { totalShifts: number; totalHours: number; totalUsers: number };
  monthlyUserMetrics?: MonthlyMetricsUserItem[];
  dailyOverview?: DailyOverviewSummary | null;
  /** Month (1–12) for on-track vs behind. */
  monthForMetrics?: number;
  /** Year for on-track vs behind. */
  yearForMetrics?: number;
  chartsLoading: boolean;
}

export function AttendanceChartsSection({
  attendanceRate: _attendanceRate,
  reportPeriod: _reportPeriod,
  organizationMetrics: _organizationMetrics,
  monthlySummary: _monthlySummary,
  monthlyUserMetrics = [],
  dailyOverview,
  monthForMetrics,
  yearForMetrics,
  chartsLoading,
}: AttendanceChartsSectionProps) {
  const presentVsAbsentData = useMemo(() => {
    if (!dailyOverview || (dailyOverview.presentEmployees === 0 && dailyOverview.absentEmployees === 0)) return [];
    return [
      { name: 'Present', value: dailyOverview.presentEmployees, fill: getChartColor(0) },
      { name: 'Absent', value: dailyOverview.absentEmployees, fill: getChartColor(1) },
    ].filter((d) => d.value > 0);
  }, [dailyOverview]);

  const expectedHoursPerUser =
    monthForMetrics != null && yearForMetrics != null
      ? workingDaysInMonth(yearForMetrics, monthForMetrics) * EXPECTED_HOURS_PER_DAY
      : 0;

  const onTrackVsBehindData = useMemo(() => {
    if (expectedHoursPerUser <= 0 || monthlyUserMetrics.length === 0) return [];
    let onTrack = 0;
    let behind = 0;
    for (const u of monthlyUserMetrics) {
      if (u.totalShifts === 0 && u.totalHours === 0) continue;
      if (u.totalHours >= expectedHoursPerUser) onTrack++;
      else behind++;
    }
    return [
      ...(onTrack > 0 ? [{ name: 'On track', value: onTrack, fill: getChartColor(0) }] : []),
      ...(behind > 0 ? [{ name: 'Behind', value: behind, fill: getChartColor(1) }] : []),
    ];
  }, [monthlyUserMetrics, expectedHoursPerUser]);

  if (chartsLoading) {
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
      </div>

      {/* 1. Present vs absent */}
      <Card>
        <CardHeader>
          <CardTitle>Present vs absent</CardTitle>
          <CardDescription>Selected day: who was present or absent</CardDescription>
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
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox && dailyOverview) {
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
                              {typeof dailyOverview.attendanceRate === 'number'
                                ? `${dailyOverview.attendanceRate.toFixed(0)}%`
                                : '—'}
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
          <div className="text-muted-foreground leading-none">Based on selected day</div>
        </CardFooter>
      </Card>

      {/* 2. On track hours vs behind hours */}
      <Card>
        <CardHeader>
          <CardTitle>On track vs behind hours</CardTitle>
          <CardDescription>
            Employees meeting expected hours vs shortfall (month, {EXPECTED_HOURS_PER_DAY}h/day)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {onTrackVsBehindData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <ChartContainer
              config={ON_TRACK_CHART_CONFIG}
              className="mx-auto aspect-square max-h-[200px] sm:max-h-[250px]"
            >
              <RechartsPieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={onTrackVsBehindData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                  cornerRadius={6}
                  paddingAngle={2}
                >
                  {onTrackVsBehindData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        const onTrack = onTrackVsBehindData.find((d) => d.name === 'On track')?.value ?? 0;
                        const behind = onTrackVsBehindData.find((d) => d.name === 'Behind')?.value ?? 0;
                        const total = onTrack + behind;
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
                              {formatCompactValue(total)}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy ?? 0) + 24}
                              className="fill-muted-foreground"
                            >
                              employees
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
            Expected: {expectedHoursPerUser}h/month (working days × {EXPECTED_HOURS_PER_DAY}h)
          </div>
        </CardFooter>
      </Card>

      {/* 3. Attendance for the day */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance for the day</CardTitle>
          <CardDescription>Summary for the selected date</CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          {!dailyOverview ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">
                {(() => {
                  try {
                    return format(parseISO(dailyOverview.date), 'EEEE, MMMM d, yyyy');
                  } catch {
                    return dailyOverview.date;
                  }
                })()}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Present</p>
                  <p className="text-2xl font-semibold text-foreground">{dailyOverview.presentEmployees}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Absent</p>
                  <p className="text-2xl font-semibold text-foreground">{dailyOverview.absentEmployees}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total employees</p>
                  <p className="text-2xl font-semibold text-foreground">{dailyOverview.totalEmployees}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Attendance rate</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {typeof dailyOverview.attendanceRate === 'number'
                      ? `${dailyOverview.attendanceRate.toFixed(1)}%`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">Selected day from date range</div>
        </CardFooter>
      </Card>
    </div>
  );
}
