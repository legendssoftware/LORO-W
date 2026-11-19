'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useTranslation } from 'react-i18next';

const AREA_PALETTE = [
  ATT_CHART_HSL.c2,
  ATT_CHART_HSL.c1,
  ATT_CHART_HSL.c5,
  ATT_CHART_HSL.c4,
  ATT_CHART_HSL.c3,
] as const;

const RANGE_OPTIONS = [
  { value: '6m', labelKey: 'chrome.reports.range.last6', months: 6 },
  { value: '3m', labelKey: 'chrome.reports.range.last3', months: 3 },
  { value: '1m', labelKey: 'chrome.reports.range.last1', months: 1 },
] as const;

type TimeRange = (typeof RANGE_OPTIONS)[number]['value'];

export type ReportsTrendSeries = {
  key: string;
  label: string;
  color?: string;
};

interface ReportsTrendLineChartProps {
  data: Array<Record<string, string | number>>;
  series: ReportsTrendSeries[];
  xKey?: string;
  className?: string;
  heightClassName?: string;
  valueKind?: ReportsChartValueKind;
  yAxisLabel?: string;
}

export function ReportsTrendLineChart({
  data,
  series,
  xKey = 'name',
  className,
  heightClassName = 'h-[280px]',
  valueKind = 'money',
  yAxisLabel,
}: ReportsTrendLineChartProps) {
  const { t } = useTranslation('screens');
  const gradientId = React.useId().replace(/:/g, '');
  const [timeRange, setTimeRange] = React.useState<TimeRange>('6m');

  if (data.length === 0 || series.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{t('chrome.common.noData')}</p>
    );
  }

  const monthsToShow =
    RANGE_OPTIONS.find((o) => o.value === timeRange)?.months ?? 6;
  const filteredData = data.slice(-monthsToShow);

  const config: ChartConfig = {};
  for (let i = 0; i < series.length; i++) {
    const s = series[i];
    config[s.key] = {
      label: s.label,
      color: s.color ?? AREA_PALETTE[i % AREA_PALETTE.length],
    };
  }

  const rangeLabel =
    t(RANGE_OPTIONS.find((o) => o.value === timeRange)?.labelKey ?? 'chrome.reports.range.last6');
  const axisLabel = reportsYAxisLabel(valueKind, yAxisLabel);
  const xLayout = getReportsCategoryAxisLayout(
    filteredData.map((row) => String(row[xKey] ?? ''))
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-end">
        <Select
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as TimeRange)}
        >
          <SelectTrigger
            className="w-[160px] rounded-lg"
            aria-label={t('chrome.reports.range.select')}
            size="sm"
          >
            <SelectValue placeholder={rangeLabel} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {RANGE_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="rounded-lg"
              >
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ChartContainer
        config={config}
        className={cn('aspect-auto w-full', heightClassName)}
      >
        <AreaChart data={filteredData} margin={REPORTS_CHART_MARGIN}>
          <defs>
            {series.map((s) => (
              <linearGradient
                key={s.key}
                id={`fill-${s.key}-${gradientId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={`var(--color-${s.key})`}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={`var(--color-${s.key})`}
                  stopOpacity={0.1}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tickMargin={14}
            minTickGap={32}
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
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={reportsChartTooltipFormatter(valueKind, (name) => {
                  const match = series.find((s) => s.key === name);
                  return match?.label;
                })}
                indicator="dot"
              />
            }
          />
          {series.map((s) => (
            <Area
              key={s.key}
              dataKey={s.key}
              type="natural"
              fill={`url(#fill-${s.key}-${gradientId})`}
              stroke={`var(--color-${s.key})`}
              stackId="a"
            />
          ))}
          <ChartLegend
            verticalAlign="bottom"
            wrapperStyle={{ paddingTop: 16 }}
            content={<ChartLegendContent className="gap-5 pt-5" />}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
