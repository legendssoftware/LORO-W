'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import { ATT_CHART_HSL } from '@/lib/chart-colors';
import { ReportDonutChart } from '@/components/charts/report-donut-chart';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Progress } from '@/components/ui/progress';
import { humanizeReportLabel } from '@/lib/utils/report-labels';
import {
  buildPipelineValueAxis,
  formatAxisTickThousands,
  takeTopNWithOther,
} from '@/lib/utils/chart-series';
import { useTranslation } from 'react-i18next';

const CHART_TOP_N = 10;

const BAR_PALETTE = [
  ATT_CHART_HSL.c1,
  ATT_CHART_HSL.c2,
  ATT_CHART_HSL.c4,
  ATT_CHART_HSL.c5,
] as const;

export type PipelineStatusRow = { name: string; count: number; value: number };

export type PipelineVisitStats = {
  total: number;
  withSale: number;
  withQuote: number;
  withLead: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function formatCurrencyTick(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '';
  const sym =
    currency === 'ZAR'
      ? 'R '
      : new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: currency.length === 3 ? currency : 'ZAR',
          maximumFractionDigits: 0,
        })
          .formatToParts(0)
          .find((p) => p.type === 'currency')?.value ?? '';
  return `${sym}${formatAxisTickThousands(value)}`;
}

type PipelineChartsProps = {
  statusRows: PipelineStatusRow[];
  totalLeads: number;
  totalEstimatedValue: number;
  personalTargets: Record<string, unknown> | null;
  visitStats: PipelineVisitStats;
  targetCurrency: string;
};

export function PipelineCharts({
  statusRows,
  totalLeads,
  totalEstimatedValue,
  personalTargets,
  visitStats,
  targetCurrency,
}: PipelineChartsProps) {
  const { t } = useTranslation('screens');
  const convertedRow = useMemo(
    () => statusRows.find((r) => r.name === 'CONVERTED'),
    [statusRows]
  );
  const convertedCount = convertedRow?.count ?? 0;
  const convertedValue = convertedRow?.value ?? 0;

  const leadWinRatePct = useMemo(() => {
    if (totalLeads <= 0) return null;
    return (convertedCount / totalLeads) * 100;
  }, [totalLeads, convertedCount]);

  const statusDonut = useMemo(() => {
    const rows = takeTopNWithOther(
      statusRows.map((r) => ({ name: r.name, value: r.count })),
      CHART_TOP_N
    );
    const slices = rows.map((row, i) => ({
      id: row.name,
      label: humanizeReportLabel(row.name),
      value: row.value,
      fill:
        row.name === 'CONVERTED'
          ? ATT_CHART_HSL.c3
          : BAR_PALETTE[i % BAR_PALETTE.length]!,
    }));
    const config: ChartConfig = {};
    slices.forEach((s) => {
      config[s.id] = { label: s.label, color: s.fill };
    });
    return { slices, config, sum: slices.reduce((a, s) => a + s.value, 0) };
  }, [statusRows]);

  const achievedSales = useMemo(() => {
    const sales = personalTargets?.sales;
    if (!isRecord(sales)) return null;
    const raw = sales.current;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : 0;
  }, [personalTargets]);

  const hasSalesTargetBlock = useMemo(() => {
    const sales = personalTargets?.sales;
    if (!isRecord(sales)) return false;
    return sales.target != null || sales.current != null;
  }, [personalTargets]);

  const salesBarRows = useMemo(() => {
    const rows: { metric: string; amount: number }[] = [];
    if (hasSalesTargetBlock) {
      rows.push({ metric: t('chrome.pipeline.charts.achievedSales'), amount: achievedSales ?? 0 });
    }
    rows.push({ metric: t('chrome.pipeline.charts.pipelineEst'), amount: totalEstimatedValue });
    rows.push({ metric: t('chrome.pipeline.charts.wonEst'), amount: convertedValue });
    return rows;
  }, [
    hasSalesTargetBlock,
    achievedSales,
    totalEstimatedValue,
    convertedValue,
    t,
  ]);

  const salesBarAxis = useMemo(() => {
    const maxVal =
      salesBarRows.length === 0
        ? 0
        : Math.max(0, ...salesBarRows.map((d) => d.amount));
    return buildPipelineValueAxis(maxVal);
  }, [salesBarRows]);

  const salesBarConfig = {
    amount: { label: t('chrome.pipeline.charts.amountCurrency', { currency: targetCurrency }), color: ATT_CHART_HSL.c4 },
  } satisfies ChartConfig;

  const saleVisitPct =
    visitStats.total > 0 ? (visitStats.withSale / visitStats.total) * 100 : 0;
  const quoteVisitPct =
    visitStats.total > 0 ? (visitStats.withQuote / visitStats.total) * 100 : 0;
  const leadVisitPct =
    visitStats.total > 0 ? (visitStats.withLead / visitStats.total) * 100 : 0;

  const hasLeadData = totalLeads > 0;
  const hasVisitData = visitStats.total > 0;

  const visitPctBarData = useMemo(
    () => [
      { id: 'sale', outcome: t('chrome.pipeline.charts.saleRecorded'), pct: Math.round(saleVisitPct * 10) / 10 },
      { id: 'quote', outcome: t('tables.quotation'), pct: Math.round(quoteVisitPct * 10) / 10 },
      { id: 'lead', outcome: t('chrome.pipeline.charts.linkedToLead'), pct: Math.round(leadVisitPct * 10) / 10 },
    ],
    [saleVisitPct, quoteVisitPct, leadVisitPct, t]
  );

  const visitPctConfig = {
    pct: { label: t('chrome.pipeline.charts.shareOfVisits'), color: ATT_CHART_HSL.c4 },
    sale: { label: t('chrome.pipeline.charts.saleRecorded'), color: ATT_CHART_HSL.c1 },
    quote: { label: t('tables.quotation'), color: ATT_CHART_HSL.c2 },
    lead: { label: t('chrome.pipeline.charts.linkedToLead'), color: ATT_CHART_HSL.c3 },
  } satisfies ChartConfig;

  const visitBarFills = [ATT_CHART_HSL.c1, ATT_CHART_HSL.c2, ATT_CHART_HSL.c3] as const;

  if (!hasLeadData && !hasVisitData) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {t('chrome.pipeline.charts.nothingToChart')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{t('chrome.pipeline.charts.heading')}</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('chrome.pipeline.charts.leadMix')}</CardTitle>
            <CardDescription>
              {t('chrome.pipeline.charts.leadMixHint', {
                rate: hasLeadData && leadWinRatePct != null ? `${leadWinRatePct.toFixed(1)}%` : '—',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasLeadData ? (
              <p className="text-sm text-muted-foreground text-center py-10">{t('chrome.pipeline.charts.noLeads')}</p>
            ) : statusDonut.slices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('chrome.common.noData')}</p>
            ) : (
              <ReportDonutChart
                config={statusDonut.config}
                data={statusDonut.slices}
                centerPrimary={totalLeads.toLocaleString('en-ZA')}
                centerSecondary={
                  leadWinRatePct != null
                    ? t('chrome.pipeline.charts.converted', { rate: `${leadWinRatePct.toFixed(1)}%` })
                    : t('tables.conversion')
                }
                legendNameKey="name"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('chrome.pipeline.charts.salesVsPipeline')}</CardTitle>
            <CardDescription>
              {t('chrome.pipeline.charts.salesVsPipelineHint')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasLeadData ? (
              <p className="text-sm text-muted-foreground text-center py-10">{t('chrome.pipeline.charts.noLeads')}</p>
            ) : (
              <>
                {!hasSalesTargetBlock && (
                  <p className="text-xs text-muted-foreground mb-2">{t('chrome.pipeline.charts.noSalesTarget')}</p>
                )}
                <ChartContainer config={salesBarConfig} className="aspect-auto h-[280px] w-full">
                  <BarChart
                    data={salesBarRows}
                    accessibilityLayer
                    margin={{ top: 28, right: 8, left: 8, bottom: 8 }}
                    barCategoryGap="20%"
                    barGap={4}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="metric"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      angle={-20}
                      textAnchor="end"
                      height={72}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      domain={[0, salesBarAxis.domainMax]}
                      ticks={salesBarAxis.ticks}
                      tickFormatter={(v) => formatCurrencyTick(Number(v), targetCurrency)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar dataKey="amount" radius={8} fill="var(--color-amount)">
                      <LabelList
                        position="top"
                        dataKey="amount"
                        offset={6}
                        className="fill-foreground text-xs"
                        formatter={(v: number | string) =>
                          `${targetCurrency} ${Number(v).toLocaleString('en-ZA', {
                            maximumFractionDigits: 0,
                          })}`
                        }
                      />
                    </Bar>
                    <ChartLegend content={<ChartLegendContent />} />
                  </BarChart>
                </ChartContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {hasVisitData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('chrome.pipeline.charts.visitOutcomeRates')}</CardTitle>
            <CardDescription>{t('chrome.pipeline.charts.visitOutcomeHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <ChartContainer config={visitPctConfig} className="aspect-auto h-[200px] w-full">
              <BarChart
                layout="vertical"
                data={visitPctBarData}
                accessibilityLayer
                margin={{ left: 4, right: 16, top: 8, bottom: 8 }}
                barCategoryGap={12}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="outcome"
                  tickLine={false}
                  axisLine={false}
                  width={112}
                  tickMargin={8}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="pct" radius={6} name="pct">
                  {visitPctBarData.map((row, i) => (
                    <Cell key={row.id} fill={visitBarFills[i % visitBarFills.length]} />
                  ))}
                  <LabelList
                    dataKey="pct"
                    position="right"
                    className="fill-foreground text-xs"
                    formatter={(v: number | string) =>
                      `${typeof v === 'number' ? v.toFixed(1) : v}%`
                    }
                  />
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground">{t('chrome.pipeline.charts.counts')}</p>
              <div className="space-y-2">
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span>{t('chrome.pipeline.charts.saleRecorded')}</span>
                  <span className="tabular-nums text-foreground font-medium">
                    {visitStats.withSale} / {visitStats.total} ({saleVisitPct.toFixed(0)}%)
                  </span>
                </div>
                <Progress value={saleVisitPct} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span>{t('tables.quotation')}</span>
                  <span className="tabular-nums text-foreground font-medium">
                    {visitStats.withQuote} / {visitStats.total} ({quoteVisitPct.toFixed(0)}%)
                  </span>
                </div>
                <Progress value={quoteVisitPct} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span>{t('chrome.pipeline.charts.linkedToLead')}</span>
                  <span className="tabular-nums text-foreground font-medium">
                    {visitStats.withLead} / {visitStats.total} ({leadVisitPct.toFixed(0)}%)
                  </span>
                </div>
                <Progress value={leadVisitPct} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
