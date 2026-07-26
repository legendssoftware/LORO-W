'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { ATT_CHART_HSL } from '@/lib/chart-colors';
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

const BAR_PALETTE = [
  ATT_CHART_HSL.c2,
  ATT_CHART_HSL.c1,
  ATT_CHART_HSL.c5,
  ATT_CHART_HSL.c4,
  ATT_CHART_HSL.c3,
] as const;

const DEFAULT_MAX_BAR_SIZE = 36;

interface ReportsNamedBarChartProps {
  data: Array<{ name: string; value: number }>;
  className?: string;
  heightClassName?: string;
  /** Single fill for all bars; otherwise rotate palette. */
  fill?: string;
  valueKind?: ReportsChartValueKind;
  /** Override Y-axis title (defaults from valueKind). */
  yAxisLabel?: string;
  /** Legend series label (defaults from valueKind). */
  seriesLabel?: string;
  maxBarSize?: number;
}

export function ReportsNamedBarChart({
  data,
  className,
  heightClassName = 'h-[260px]',
  fill,
  valueKind = 'count',
  yAxisLabel,
  seriesLabel,
  maxBarSize = DEFAULT_MAX_BAR_SIZE,
}: ReportsNamedBarChartProps) {
  const axisLabel = reportsYAxisLabel(valueKind, yAxisLabel);
  const legendLabel = seriesLabel?.trim() || axisLabel;
  const config: ChartConfig = {
    value: {
      label: legendLabel,
      color: fill ?? ATT_CHART_HSL.c2,
    },
  };

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
    );
  }

  const xLayout = getReportsCategoryAxisLayout(data.map((row) => row.name));

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto w-full', heightClassName, className)}
    >
      <BarChart data={data} margin={REPORTS_CHART_MARGIN}>
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
              hideLabel
              formatter={reportsChartTooltipFormatter(
                valueKind,
                (_name, item) => {
                  const payloadName = item.payload?.name;
                  return typeof payloadName === 'string'
                    ? payloadName
                    : legendLabel;
                }
              )}
            />
          }
        />
        <ChartLegend
          verticalAlign="bottom"
          wrapperStyle={{ paddingTop: 16 }}
          content={<ChartLegendContent className="gap-5 pt-5" />}
        />
        <Bar dataKey="value" radius={4} maxBarSize={maxBarSize}>
          {data.map((row, i) => (
            <Cell
              key={`${row.name}-${i}`}
              fill={fill ?? BAR_PALETTE[i % BAR_PALETTE.length]}
            />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            className="fill-foreground text-[10px]"
            formatter={(v: number) => formatReportChartValue(v, valueKind)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
