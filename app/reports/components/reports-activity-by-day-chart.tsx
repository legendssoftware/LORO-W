'use client';

import { Target, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { REPORT_CHART_HSL } from '@/app/reports/components/reports-chart-palette';
import type { TargetsProgressBucketRow } from '@/api/types/targets-progress';

const chartConfig = {
  achievedActivity: {
    label: 'Activity',
    color: REPORT_CHART_HSL.c4,
  },
  achievedLeads: {
    label: 'Leads',
    color: REPORT_CHART_HSL.c3,
  },
} satisfies ChartConfig;

function bucketRowsToSeries(rows: TargetsProgressBucketRow[]) {
  return rows.map((b) => ({
    label: b.label.length > 14 ? b.key : b.label,
    fullLabel: b.label,
    achievedActivity: b.achievedCalls + b.achievedVisits,
    achievedLeads: b.achievedLeads,
  }));
}

export interface ReportsActivityByDayChartProps {
  aggregateBuckets: TargetsProgressBucketRow[] | undefined;
  dateFrom: string;
  dateTo: string;
  elevated: boolean;
  usersInScopeCount: number;
  behindCount: number;
}

export function ReportsActivityByDayChart({
  aggregateBuckets,
  dateFrom,
  dateTo,
  elevated,
  usersInScopeCount,
  behindCount,
}: ReportsActivityByDayChartProps) {
  const chartSeriesData = bucketRowsToSeries(aggregateBuckets ?? []);

  return (
    <Card className="border border-gray-200 bg-white shadow-sm min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="size-5" aria-hidden />
          Achieved activity by day
        </CardTitle>
        <CardDescription>
          Activity (all check-ins) and leads per day ({dateFrom} – {dateTo})
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-0">
        {chartSeriesData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 px-6">
            No days in this range.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[340px] w-full">
            <BarChart accessibilityLayer data={chartSeriesData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis tickLine={false} axisLine={false} width={40} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dashed"
                    labelFormatter={(_, payload) =>
                      (payload?.[0]?.payload as { fullLabel?: string })
                        ?.fullLabel ?? ''
                    }
                  />
                }
              />
              <ChartLegend
                content={<ChartLegendContent className="flex-wrap" />}
                verticalAlign="top"
              />
              <Bar
                dataKey="achievedActivity"
                fill="var(--color-achievedActivity)"
                radius={4}
              />
              <Bar
                dataKey="achievedLeads"
                fill="var(--color-achievedLeads)"
                radius={4}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-1 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
          <Users className="size-4 shrink-0" aria-hidden />
          {usersInScopeCount} user(s) in scope
          {elevated && behindCount > 0 ? (
            <span className="text-amber-700 dark:text-amber-400">
              · {behindCount} behind (current progress scope)
            </span>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  );
}
