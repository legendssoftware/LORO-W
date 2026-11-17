'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import {
  getReportsCategoryAxisLayout,
  REPORTS_CHART_MARGIN,
  reportsYAxisLabel,
  reportsYAxisLabelProps,
  reportsYAxisWidth,
  type ReportsChartValueKind,
} from '@/app/reports/lib/reports-chart-format';
import { reportsChartTooltipFormatter } from '@/app/reports/lib/reports-chart-tooltip';
import type { GroupedBarSeries } from '@/app/reports/components/reports-grouped-bar-chart';

const DEFAULT_MAX_BAR_SIZE = 36;

interface ReportsStackedBarChartProps {
  data: Array<Record<string, string | number>>;
  categoryKey: string;
  series: GroupedBarSeries[];
  className?: string;
  heightClassName?: string;
  valueKind?: ReportsChartValueKind;
  yAxisLabel?: string;
  maxBarSize?: number;
}

/**
 * Stacked bar chart for one category axis and several count series.
 * Series order is bottom to top.
 */
export function ReportsStackedBarChart({
  data,
  categoryKey,
  series,
  className,
  heightClassName = 'h-[320px]',
  valueKind = 'count',
  yAxisLabel,
  maxBarSize = DEFAULT_MAX_BAR_SIZE,
}: ReportsStackedBarChartProps) {
  const config = series.reduce<ChartConfig>((acc, item) => {
    acc[item.key] = { label: item.label, color: item.color };
    return acc;
  }, {});

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data</p>;
  }

  const axisLabel = reportsYAxisLabel(valueKind, yAxisLabel);
  const xLayout = getReportsCategoryAxisLayout(data.map((row) => String(row[categoryKey] ?? '')));

  return (
    <ChartContainer config={config} className={cn('aspect-auto w-full', heightClassName, className)}>
      <BarChart data={data} margin={REPORTS_CHART_MARGIN}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={categoryKey}
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
          width={reportsYAxisWidth(valueKind)}
          tick={{ fontSize: 11 }}
          label={reportsYAxisLabelProps(axisLabel)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={reportsChartTooltipFormatter(valueKind, (name) => {
                const match = series.find((item) => item.key === name);
                return match?.label;
              })}
            />
          }
        />
        <ChartLegend
          verticalAlign="bottom"
          wrapperStyle={{ paddingTop: 12 }}
          content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-2" />}
        />
        {series.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            stackId="status"
            fill={`var(--color-${item.key})`}
            maxBarSize={maxBarSize}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
