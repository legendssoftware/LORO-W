'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PerformanceFilters, SalesPaceGrain } from '@/api/types/reports-performance';
import { usePerformanceSalesPace } from '@/api/hooks/use-performance-sales-pace';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  REPORTS_CHART_MARGIN,
  reportsYAxisLabelProps,
  reportsYAxisWidth,
} from '@/app/reports/lib/reports-chart-format';
import { reportsTooltipRow } from '@/app/reports/lib/reports-chart-tooltip';
import { formatPerformanceMoney } from '../lib/format';

const CHART_COLORS = {
  actual: 'hsl(142 76% 36%)',
  projected: 'hsl(38 92% 50%)',
} as const;

function formatPaceDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function compactMoney(value: number, symbol: string): string {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  let body: string;
  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    body = `${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')}M`;
  } else if (abs >= 1_000) {
    const thousands = abs / 1_000;
    body = `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '')}K`;
  } else {
    body = Math.round(abs).toLocaleString('en-ZA');
  }
  return `${sign}${symbol}${body}`;
}

function PaceStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
      {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PerformanceSalesPaceChart({
  filters,
  skipCacheRef,
}: {
  filters: PerformanceFilters;
  skipCacheRef: MutableRefObject<boolean>;
}) {
  const { t } = useTranslation('screens');
  const [grain, setGrain] = useState<SalesPaceGrain>('month');
  const chartConfig = useMemo(
    () =>
      ({
        actual: { label: t('chrome.performance.pace.sales'), color: CHART_COLORS.actual },
        projected: { label: t('chrome.performance.pace.projected'), color: CHART_COLORS.projected },
      }) satisfies ChartConfig,
    [t],
  );
  const [isChartVisible, setIsChartVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = chartRef.current;
    if (!node || isChartVisible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setIsChartVisible(true);
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isChartVisible]);

  const query = usePerformanceSalesPace({
    filters,
    grain,
    enabled: isChartVisible,
    skipCacheRef,
  });

  const pace = query.data;
  const symbol = pace?.currency.symbol || 'R';
  const summary = pace?.summary;
  const chartData = useMemo(
    () =>
      (pace?.points ?? []).map((point) => ({
        label: point.label,
        date: point.date,
        actual: point.actual ?? undefined,
        projected: point.projected ?? undefined,
      })),
    [pace?.points],
  );

  const description = pace
    ? `${formatPaceDate(pace.periodStart)} – ${formatPaceDate(pace.asOf)}`
    : grain === 'month'
      ? t('chrome.performance.pace.descMonth')
      : t('chrome.performance.pace.descYear');

  const varianceHint = summary
    ? t(
        summary.variance >= 0 ? 'chrome.performance.pace.aboveTarget' : 'chrome.performance.pace.shortOfTarget',
        { amount: formatPerformanceMoney(Math.abs(summary.variance), symbol) },
      )
    : undefined;

  const showLoading = !isChartVisible || query.isLoading || (query.isPending && !query.isError);

  return (
    <div ref={chartRef}>
    <Card className="min-w-0 shadow-sm" data-tour="performance-sales-pace">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-sm font-medium">{t('chrome.performance.pace.title')}</CardTitle>
          <CardDescription className="text-xs">
            {description}
            {summary?.earlyPace ? ` · ${t('chrome.performance.pace.earlyPace')}` : ''}
          </CardDescription>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={grain}
          onValueChange={(value) => {
            if (value === 'month' || value === 'year') setGrain(value);
          }}
          aria-label={t('chrome.performance.pace.periodAria')}
        >
          <ToggleGroupItem value="month">{t('chrome.performance.pace.month')}</ToggleGroupItem>
          <ToggleGroupItem value="year">{t('chrome.performance.pace.year')}</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {showLoading ? (
          <div className="flex h-[224px] items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : query.isError ? (
          <div className="flex h-[224px] flex-col items-center justify-center gap-2 text-center">
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-xs text-muted-foreground">{t('chrome.performance.pace.loadFailed')}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
              <RefreshCw className="mr-1.5 size-3.5" />
              {t('actions.retry')}
            </Button>
          </div>
        ) : summary ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PaceStat
                label={t('chrome.performance.pace.salesSoFar')}
                value={formatPerformanceMoney(summary.salesToDate, symbol)}
              />
              <PaceStat
                label={t('chrome.performance.pace.avgPerDay')}
                value={formatPerformanceMoney(summary.dailyRate, symbol)}
              />
              <PaceStat
                label={grain === 'month' ? t('chrome.performance.pace.projectedMonthEnd') : t('chrome.performance.pace.projectedYearEnd')}
                value={formatPerformanceMoney(summary.projectedClose, symbol)}
              />
              <PaceStat
                label={summary.targetLabel}
                value={formatPerformanceMoney(summary.target, symbol)}
                hint={varianceHint}
              />
            </div>
            <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
              <LineChart data={chartData} margin={REPORTS_CHART_MARGIN}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={grain === 'month' ? 2 : 0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={reportsYAxisWidth('money')}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value: number) => compactMoney(value, symbol)}
                  label={reportsYAxisLabelProps(t('chrome.performance.pace.sales'))}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_label, payload) => {
                        const date = payload?.[0]?.payload?.date;
                        return typeof date === 'string' ? formatPaceDate(date) : String(_label ?? '');
                      }}
                      formatter={(value, name, item) =>
                        reportsTooltipRow(value, name, item, {
                          formatValue: (amount) => formatPerformanceMoney(amount, symbol),
                        })
                      }
                    />
                  }
                />
                <Line
                  dataKey="actual"
                  type="monotone"
                  stroke="var(--color-actual)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  name="actual"
                />
                <Line
                  dataKey="projected"
                  type="linear"
                  stroke="var(--color-projected)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls={false}
                  name="projected"
                />
              </LineChart>
            </ChartContainer>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-[hsl(142_76%_36%)]" />
                {t('chrome.performance.pace.sales')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-0.5 w-4"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, hsl(38 92% 50%) 0 4px, transparent 4px 7px)',
                  }}
                />
                {t('chrome.performance.pace.projectedClose')}
              </span>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('chrome.performance.pace.none')}</p>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
