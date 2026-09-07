'use client';

import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ReportDonutChart } from '@/components/charts/report-donut-chart';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ReportsChartCard } from '@/app/reports/components/reports-chart-card';
import { ReportsNamedBarChart } from '@/app/reports/components/reports-named-bar-chart';
import { toDonutSlices } from '@/app/reports/lib/reports-dashboard-chart-helpers';
import { takeTopNWithOther } from '@/lib/utils/chart-series';
import {
  formatReportChartValue,
  REPORTS_CHART_MARGIN,
  reportsYAxisLabelProps,
  reportsYAxisWidth,
} from '@/app/reports/lib/reports-chart-format';
import { reportsChartTooltipFormatter } from '@/app/reports/lib/reports-chart-tooltip';
import { ATT_CHART_HSL } from '@/lib/chart-colors';
import type { PerformanceChartPoint } from '@/api/types/reports-performance';
import { formatPerformanceMoney } from '../lib/format';

function toBars(data: PerformanceChartPoint[]) {
  return takeTopNWithOther(
    data.map((d) => ({ name: d.label || 'Unknown', value: d.value })),
    10
  );
}

export function PerformancePieChartCard({
  title,
  description,
  data,
  currency,
}: {
  title: string;
  description: string;
  data: PerformanceChartPoint[];
  currency: string;
}) {
  const fullTotal = data.reduce((sum, d) => sum + (Number.isFinite(d.value) ? d.value : 0), 0);
  const visual =
    data.length > 3
      ? takeTopNWithOther(
          data.map((d) => ({ name: d.label, value: d.value })),
          2
        )
      : data.map((d) => ({ name: d.label, value: d.value }));
  const { slices, config } = toDonutSlices(visual);
  return (
    <ReportsChartCard title={title} description={description}>
      <ReportDonutChart
        config={config}
        data={slices}
        centerPrimary={formatPerformanceMoney(fullTotal, currency)}
        centerSecondary="Revenue"
        formatValue={(v) => formatPerformanceMoney(v, currency)}
      />
    </ReportsChartCard>
  );
}

export function PerformanceBarChartCard({
  title,
  description,
  data,
  fill,
}: {
  title: string;
  description: string;
  data: PerformanceChartPoint[];
  fill?: string;
}) {
  return (
    <ReportsChartCard title={title} description={description}>
      <ReportsNamedBarChart data={toBars(data)} valueKind="money" fill={fill} />
    </ReportsChartCard>
  );
}

export function PerformanceAreaChartCard({
  title,
  description,
  data,
  isLoading,
  isError,
  onRetry,
}: {
  title: string;
  description: string;
  data: PerformanceChartPoint[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const chartData = data.map((d) => ({ name: d.label || '', value: d.value }));
  const gradientId = useId().replace(/:/g, '');
  const config: ChartConfig = {
    value: { label: 'Revenue', color: ATT_CHART_HSL.c4 },
  };

  return (
    <ReportsChartCard
      title={title}
      description={description}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
    >
      {chartData.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
          <AreaChart data={chartData} margin={REPORTS_CHART_MARGIN}>
            <defs>
              <linearGradient id={`perfAreaFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ATT_CHART_HSL.c4} stopOpacity={0.8} />
                <stop offset="95%" stopColor={ATT_CHART_HSL.c4} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={reportsYAxisWidth('money')}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => formatReportChartValue(v, 'money') || '0'}
              label={reportsYAxisLabelProps('Revenue')}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={reportsChartTooltipFormatter('money')}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="value"
              type="natural"
              fill={`url(#perfAreaFill-${gradientId})`}
              stroke={ATT_CHART_HSL.c4}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </ReportsChartCard>
  );
}
