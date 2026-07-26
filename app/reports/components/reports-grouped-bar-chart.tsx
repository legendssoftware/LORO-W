'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { REPORT_PIE_LEGEND_MAX_ITEMS } from '@/components/charts/report-donut-chart';
import { cn } from '@/lib/utils';
import {
  formatReportChartValue,
  getReportsCategoryAxisLayout,
  REPORTS_CHART_MARGIN,
  reportsYAxisLabel,
  reportsYAxisLabelProps,
  reportsYAxisWidth,
  type ReportsChartValueKind,
} from '@/app/reports/lib/reports-chart-format';
import { reportsChartTooltipFormatter } from '@/app/reports/lib/reports-chart-tooltip';

const DEFAULT_MAX_BAR_SIZE = 28;

export type GroupedBarSeries = {
  key: string;
  label: string;
  color: string;
};

interface ReportsGroupedBarChartProps {
  data: Array<Record<string, string | number>>;
  categoryKey: string;
  series: GroupedBarSeries[];
  className?: string;
  heightClassName?: string;
  valueKind?: ReportsChartValueKind;
  yAxisLabel?: string;
  maxBarSize?: number;
}

export function ReportsGroupedBarChart({
  data,
  categoryKey,
  series,
  className,
  heightClassName = 'h-[260px]',
  valueKind = 'count',
  yAxisLabel,
  maxBarSize = DEFAULT_MAX_BAR_SIZE,
}: ReportsGroupedBarChartProps) {
  const config = series.reduce<ChartConfig>((acc, s) => {
    acc[s.key] = { label: s.label, color: s.color };
    return acc;
  }, {});

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
    );
  }

  const axisLabel = reportsYAxisLabel(valueKind, yAxisLabel);
  const xLayout = getReportsCategoryAxisLayout(
    data.map((row) => String(row[categoryKey] ?? ''))
  );

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto w-full', heightClassName, className)}
    >
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
          tickFormatter={(v: number) =>
            formatReportChartValue(v, valueKind) || '0'
          }
          label={reportsYAxisLabelProps(axisLabel)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={reportsChartTooltipFormatter(valueKind, (name) => {
                const match = series.find((s) => s.key === name);
                return match?.label;
              })}
            />
          }
        />
        <ChartLegend
          verticalAlign="bottom"
          wrapperStyle={{ paddingTop: 16 }}
          content={
            <ChartLegendContent
              maxItems={REPORT_PIE_LEGEND_MAX_ITEMS}
              className="gap-5 pt-5"
            />
          }
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            fill={`var(--color-${s.key})`}
            radius={4}
            maxBarSize={maxBarSize}
          >
            <LabelList
              dataKey={s.key}
              position="top"
              className="fill-foreground text-[10px]"
              formatter={(v: number) => formatReportChartValue(v, valueKind)}
            />
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  );
}
