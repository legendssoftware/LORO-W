'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { CallQualityDailyPoint } from '@/api/types/reports-call-quality';
import {
  REPORTS_CHART_BLUE,
  REPORTS_CHART_GREEN,
} from '@/app/reports/lib/reports-dashboard-chart-helpers';
import {
  formatReportChartValue,
  getReportsCategoryAxisLayout,
  REPORTS_CHART_MARGIN,
  reportsYAxisLabelProps,
  reportsYAxisWidth,
} from '@/app/reports/lib/reports-chart-format';
import { reportsChartTooltipFormatter } from '@/app/reports/lib/reports-chart-tooltip';
import { cn } from '@/lib/utils';

export function ReportsCallQualityTrendChart({
  daily,
}: {
  daily: CallQualityDailyPoint[];
}) {
  if (daily.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No daily series</p>;
  }

  const data = daily.map((row) => ({
    name: row.date.slice(5),
    calls: row.calls,
    qualityConversations: row.qualityConversations,
  }));

  const config = {
    calls: { label: 'Recordings', color: REPORTS_CHART_BLUE },
    qualityConversations: { label: 'Quality conversations', color: REPORTS_CHART_GREEN },
  } satisfies ChartConfig;

  const xLayout = getReportsCategoryAxisLayout(data.map((row) => row.name));

  return (
    <ChartContainer config={config} className={cn('aspect-auto h-[200px] w-full')}>
      <AreaChart data={data} margin={REPORTS_CHART_MARGIN}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={14}
          interval={0}
          angle={xLayout.angle}
          textAnchor={xLayout.textAnchor}
          height={xLayout.height}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          width={reportsYAxisWidth('count')}
          tick={{ fontSize: 11 }}
          tickFormatter={(value: number) => formatReportChartValue(value, 'count') || '0'}
          label={reportsYAxisLabelProps('Calls')}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={reportsChartTooltipFormatter('count', (name) => {
                if (name === 'calls') return 'Recordings';
                if (name === 'qualityConversations') return 'Quality conversations';
                return name;
              })}
            />
          }
        />
        <Area
          dataKey="calls"
          type="monotone"
          fill="var(--color-calls)"
          fillOpacity={0.15}
          stroke="var(--color-calls)"
        />
        <Area
          dataKey="qualityConversations"
          type="monotone"
          fill="var(--color-qualityConversations)"
          fillOpacity={0.25}
          stroke="var(--color-qualityConversations)"
        />
        <ChartLegend
          verticalAlign="bottom"
          wrapperStyle={{ paddingTop: 16 }}
          content={<ChartLegendContent className="gap-5 pt-5" />}
        />
      </AreaChart>
    </ChartContainer>
  );
}
