'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompetitorsMissingGeocode } from '@/api/hooks/use-competitors-map-data';
import { MissingCompetitorsList } from '@/app/visualiser/components/missing-competitors-list';
import { formatZarShort } from '@/lib/site-opportunity/format-potential';
import {
  brandChartColor,
  brandTurnoverZAR,
  resolveHardwareBrand,
} from '@/lib/site-opportunity/compute/brands';
import type { HardwareBrandKey } from '@/api/types/site-opportunity';
import { getMarkerCountryKey } from '@/lib/utils/marker-geo-resolve';
import { getCountryFlag, normalizeCountryToken } from '@/lib/utils/country-flags';
import {
  LAYER_META,
  type VisualiserLayerId,
  type VisualiserMapPoint,
} from '@/lib/utils/visualiser-map-points';

const LAYER_ORDER: VisualiserLayerId[] = [
  'hq',
  'branches',
  'clients',
  'competitors',
  'reps',
];

const GEO_TOP_N = 12;

type CountryValueRow = {
  country: string;
  countryLabel: string;
  count: number;
  monthlyValue: number;
};

function pointGeoMarker(point: VisualiserMapPoint) {
  return {
    address: point.address,
    latitude: point.latitude,
    longitude: point.longitude,
    name: point.name,
  };
}

function competitorBrand(point: VisualiserMapPoint): HardwareBrandKey {
  const token = point.brandKey?.trim();
  if (token) {
    return resolveHardwareBrand({ name: point.name, accountName: token });
  }
  return resolveHardwareBrand({ name: point.name });
}

function brandLabel(brand: HardwareBrandKey): string {
  return brand === 'OTHER' ? 'Other' : brand;
}

function brandSlug(brand: HardwareBrandKey): string {
  return brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function countryAxisLabel(country: string): string {
  const flag = getCountryFlag(
    normalizeCountryToken(country) ?? country,
  ).flag;
  return `${flag} ${country}`;
}

function takeTopCountries(
  rows: CountryValueRow[],
  n: number,
  rank: (row: CountryValueRow) => number,
): CountryValueRow[] {
  const sorted = [...rows].sort((a, b) => rank(b) - rank(a) || b.count - a.count);
  if (sorted.length <= n) return sorted;
  const head = sorted.slice(0, n);
  const rest = sorted.slice(n);
  const totals = rest.reduce(
    (acc, row) => ({
      count: acc.count + row.count,
      monthlyValue: acc.monthlyValue + row.monthlyValue,
    }),
    { count: 0, monthlyValue: 0 },
  );
  if (totals.count <= 0 && totals.monthlyValue <= 0) return head;
  return [
    ...head,
    {
      country: 'Other',
      countryLabel: countryAxisLabel('Other'),
      count: totals.count,
      monthlyValue: totals.monthlyValue,
    },
  ];
}

function CountryTick({
  x,
  y,
  payload,
  angle = 0,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  angle?: number;
}) {
  const label = String(payload?.value ?? '');
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text
        dy={12}
        textAnchor={angle !== 0 ? 'end' : 'middle'}
        transform={angle !== 0 ? `rotate(${angle})` : undefined}
        className="fill-muted-foreground text-[10px]"
      >
        {label}
      </text>
    </g>
  );
}

function formatBarCount(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '';
  return Math.round(v).toLocaleString();
}

function formatBarRevenue(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '';
  return formatZarShort(v);
}

function formatShare(value: number, total: number): string {
  if (!Number.isFinite(value) || total <= 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

const BAR_TOP_LABEL_FONT_SIZE = 8;

/** SVG label above a bar. Uses fontSize so Recharts cannot override Tailwind text-* classes. */
function BarTopLabel({
  x = 0,
  y = 0,
  width = 0,
  value,
  formatter,
}: {
  x?: number;
  y?: number;
  width?: number;
  value?: number | string;
  formatter: (v: number) => string;
}) {
  const numeric = typeof value === 'number' ? value : Number(value);
  const label = formatter(numeric);
  if (!label) return null;
  return (
    <text
      x={x + width / 2}
      y={y}
      dy={-4}
      textAnchor="middle"
      className="fill-foreground"
      fontSize={BAR_TOP_LABEL_FONT_SIZE}
    >
      {label}
    </text>
  );
}

interface MapSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  points: VisualiserMapPoint[];
  counts: Record<VisualiserLayerId, number>;
}

export function MapSummaryModal({
  open,
  onOpenChange,
  points,
  counts,
}: MapSummaryModalProps) {
  const total = points.length;
  const missingQuery = useCompetitorsMissingGeocode({ enabled: open });

  const competitorPoints = useMemo(
    () => points.filter((point) => point.layer === 'competitors'),
    [points],
  );

  const brandRows = useMemo(() => {
    const byBrand = new Map<HardwareBrandKey, { count: number; monthlyValue: number }>();
    for (const point of competitorPoints) {
      const brand = competitorBrand(point);
      const prev = byBrand.get(brand) ?? { count: 0, monthlyValue: 0 };
      byBrand.set(brand, {
        count: prev.count + 1,
        monthlyValue: prev.monthlyValue + brandTurnoverZAR(brand),
      });
    }
    const monthlyTotal = [...byBrand.values()].reduce(
      (sum, row) => sum + row.monthlyValue,
      0,
    );
    return [...byBrand.entries()]
      .map(([brand, row]) => ({
        brand,
        label: brandLabel(brand),
        slug: brandSlug(brand),
        count: row.count,
        monthlyValue: row.monthlyValue,
        share: monthlyTotal > 0 ? (row.monthlyValue / monthlyTotal) * 100 : 0,
        fill: brandChartColor(brand),
      }))
      .filter((row) => row.count > 0);
  }, [competitorPoints]);

  const competitorMonthlyTotal = useMemo(
    () => brandRows.reduce((sum, row) => sum + row.monthlyValue, 0),
    [brandRows],
  );

  const brandCountChart = useMemo(
    () => [...brandRows].sort((a, b) => b.count - a.count || b.monthlyValue - a.monthlyValue),
    [brandRows],
  );

  const brandShareChart = useMemo(
    () =>
      [...brandRows].sort(
        (a, b) => b.monthlyValue - a.monthlyValue || b.count - a.count,
      ),
    [brandRows],
  );

  const brandCountConfig = useMemo(() => {
    const config: ChartConfig = {
      count: { label: 'Stores', color: LAYER_META.competitors.color },
    };
    for (const row of brandCountChart) {
      config[row.slug] = { label: row.label, color: row.fill };
    }
    return config;
  }, [brandCountChart]);

  const brandShareConfig = useMemo(() => {
    const config: ChartConfig = {
      monthlyValue: { label: 'Monthly turnover', color: 'var(--chart-1)' },
    };
    for (const row of brandShareChart) {
      config[row.slug] = { label: row.label, color: row.fill };
    }
    return config;
  }, [brandShareChart]);

  const countryRows = useMemo(() => {
    const byCountry = new Map<string, CountryValueRow>();
    for (const point of competitorPoints) {
      const country = getMarkerCountryKey(pointGeoMarker(point));
      const brand = competitorBrand(point);
      const row = byCountry.get(country) ?? {
        country,
        countryLabel: countryAxisLabel(country),
        count: 0,
        monthlyValue: 0,
      };
      row.count += 1;
      row.monthlyValue += brandTurnoverZAR(brand);
      byCountry.set(country, row);
    }
    return Array.from(byCountry.values());
  }, [competitorPoints]);

  const countryCountChart = useMemo(
    () => takeTopCountries(countryRows, GEO_TOP_N, (row) => row.count),
    [countryRows],
  );

  const countryValueChart = useMemo(
    () => takeTopCountries(countryRows, GEO_TOP_N, (row) => row.monthlyValue),
    [countryRows],
  );

  const countryCountConfig: ChartConfig = {
    count: {
      label: 'Stores',
      color: LAYER_META.competitors.color,
    },
  };

  const countryValueConfig: ChartConfig = {
    monthlyValue: {
      label: 'Monthly turnover',
      color: 'hsl(38 92% 45%)',
    },
  };

  const comparisonRows = useMemo(
    () =>
      LAYER_ORDER.map((id) => {
        const layerPoints = points.filter((p) => p.layer === id);
        const storedRevenue = layerPoints.reduce((sum, p) => {
          const rev = p.estimatedAnnualRevenue;
          return sum + (rev != null && Number.isFinite(rev) ? Number(rev) : 0);
        }, 0);
        return {
          id,
          label: LAYER_META[id].label,
          count: counts[id],
          share: total > 0 ? (counts[id] / total) * 100 : 0,
          withRevenue: layerPoints.filter((p) => Boolean(p.metricValue)).length,
          revenueTotal:
            id === 'competitors' ? competitorMonthlyTotal : storedRevenue,
          withAddress: layerPoints.filter((p) => Boolean(p.address)).length,
        };
      }),
    [competitorMonthlyTotal, counts, points, total],
  );

  const comparisonTotals = useMemo(() => {
    return comparisonRows.reduce(
      (acc, row) => ({
        count: acc.count + row.count,
        withRevenue: acc.withRevenue + row.withRevenue,
        revenueTotal: acc.revenueTotal + row.revenueTotal,
        withAddress: acc.withAddress + row.withAddress,
      }),
      { count: 0, withRevenue: 0, revenueTotal: 0, withAddress: 0 },
    );
  }, [comparisonRows]);

  const missingItems = missingQuery.data ?? [];
  const competitorCount = competitorPoints.length;
  const countryAngle = countryCountChart.length > 5 ? -25 : 0;
  const countryValueAngle = countryValueChart.length > 5 ? -25 : 0;
  const brandAngle = brandCountChart.length > 4 ? -20 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[80vw] max-w-[80vw] flex-col overflow-hidden sm:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle>Summary</DialogTitle>
          <DialogDescription>
            Snapshot of {total.toLocaleString()} mapped locations.{' '}
            {competitorCount.toLocaleString()} competitor stores.
            {competitorMonthlyTotal > 0
              ? ` Modelled monthly pool ${formatZarShort(competitorMonthlyTotal)}.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Competitors by country</h3>
              {countryCountChart.length > 0 ? (
                <ChartContainer
                  config={countryCountConfig}
                  className="aspect-auto h-[260px] w-full"
                >
                  <BarChart
                    data={countryCountChart}
                    accessibilityLayer
                    margin={{ left: 8, right: 8, top: 24, bottom: 8 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="countryLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={0}
                      angle={countryAngle}
                      textAnchor={countryAngle !== 0 ? 'end' : 'middle'}
                      height={countryAngle !== 0 ? 72 : 40}
                      tick={<CountryTick angle={countryAngle} />}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={4}
                      name="Stores"
                    >
                      <LabelList
                        dataKey="count"
                        position="top"
                        content={(props) => (
                          <BarTopLabel
                            x={Number(props.x) || 0}
                            y={Number(props.y) || 0}
                            width={Number(props.width) || 0}
                            value={props.value}
                            formatter={formatBarCount}
                          />
                        )}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No competitor locations mapped.
                </p>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Competitors by brand</h3>
              {brandCountChart.length > 0 ? (
                <ChartContainer
                  config={brandCountConfig}
                  className="aspect-auto h-[260px] w-full"
                >
                  <BarChart
                    data={brandCountChart}
                    margin={{ left: 8, right: 8, top: 24, bottom: 8 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      interval={0}
                      angle={brandAngle}
                      textAnchor={brandAngle !== 0 ? 'end' : 'middle'}
                      height={brandAngle !== 0 ? 56 : 28}
                      fontSize={10}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={4} name="Stores">
                      {brandCountChart.map((row) => (
                        <Cell key={row.slug} fill={row.fill} />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="top"
                        content={(props) => (
                          <BarTopLabel
                            x={Number(props.x) || 0}
                            y={Number(props.y) || 0}
                            width={Number(props.width) || 0}
                            value={props.value}
                            formatter={formatBarCount}
                          />
                        )}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No competitor stores on the map.
                </p>
              )}
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Market share by brand</h3>
              {brandShareChart.length > 0 ? (
                <ChartContainer
                  config={brandShareConfig}
                  className="aspect-auto h-[300px] w-full"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          nameKey="slug"
                          formatter={(value, name) => {
                            const slug = String(name ?? '');
                            const row = brandShareChart.find((item) => item.slug === slug);
                            const amount =
                              typeof value === 'number' ? value : Number(value);
                            const label = row?.label ?? slug;
                            const formatted = Number.isFinite(amount)
                              ? `${formatZarShort(amount)} (${formatShare(amount, competitorMonthlyTotal)})`
                              : String(value);
                            return (
                              <span className="flex w-full items-center justify-between gap-3">
                                <span className="text-muted-foreground">{label}</span>
                                <span className="text-foreground font-mono font-medium tabular-nums">
                                  {formatted}
                                </span>
                              </span>
                            );
                          }}
                        />
                      }
                    />
                    <Pie
                      data={brandShareChart}
                      dataKey="monthlyValue"
                      nameKey="slug"
                      innerRadius="62%"
                      outerRadius="82%"
                      strokeWidth={2}
                      paddingAngle={2}
                      cornerRadius={6}
                    >
                      {brandShareChart.map((row) => (
                        <Cell key={row.slug} fill={row.fill} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                            const cy = viewBox.cy ?? 0;
                            return (
                              <text x={viewBox.cx} y={cy} textAnchor="middle">
                                <tspan
                                  x={viewBox.cx}
                                  y={cy - 6}
                                  className="fill-foreground text-sm font-bold"
                                >
                                  {formatZarShort(competitorMonthlyTotal)}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={cy + 12}
                                  className="fill-muted-foreground text-xs"
                                >
                                  Monthly
                                </tspan>
                              </text>
                            );
                          }
                          return null;
                        }}
                      />
                    </Pie>
                    <ChartLegend
                      content={
                        <ChartLegendContent
                          nameKey="slug"
                          maxItems={8}
                          className="flex-wrap gap-x-3 gap-y-1"
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No competitor stores on the map.
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Share of modelled monthly turnover (store count × brand rate).
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Market value by country</h3>
              {countryValueChart.length > 0 ? (
                <ChartContainer
                  config={countryValueConfig}
                  className="aspect-auto h-[300px] w-full"
                >
                  <BarChart
                    data={countryValueChart}
                    accessibilityLayer
                    margin={{ left: 8, right: 8, top: 24, bottom: 8 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="countryLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={0}
                      angle={countryValueAngle}
                      textAnchor={countryValueAngle !== 0 ? 'end' : 'middle'}
                      height={countryValueAngle !== 0 ? 72 : 40}
                      tick={<CountryTick angle={countryValueAngle} />}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(value: number) =>
                        formatZarShort(value).replace('R ', '')
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, _name, item) => {
                            const payload = item.payload as
                              | { countryLabel?: string }
                              | undefined;
                            const amount =
                              typeof value === 'number'
                                ? formatZarShort(value)
                                : String(value);
                            return (
                              <span className="flex w-full items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                  {payload?.countryLabel ?? 'Monthly turnover'}
                                </span>
                                <span className="text-foreground font-mono font-medium tabular-nums">
                                  {amount}
                                </span>
                              </span>
                            );
                          }}
                        />
                      }
                    />
                    <Bar
                      dataKey="monthlyValue"
                      fill="var(--color-monthlyValue)"
                      radius={4}
                      name="Monthly turnover"
                    >
                      <LabelList
                        dataKey="monthlyValue"
                        position="top"
                        content={(props) => (
                          <BarTopLabel
                            x={Number(props.x) || 0}
                            y={Number(props.y) || 0}
                            width={Number(props.width) || 0}
                            value={props.value}
                            formatter={formatBarRevenue}
                          />
                        )}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No competitor locations mapped.
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Modelled monthly turnover by country.
              </p>
            </section>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Missing address / coordinates
            </h3>
            {missingQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : missingItems.length > 0 ? (
              <div className="rounded-lg border p-3">
                <MissingCompetitorsList items={missingItems} maxVisible={10} />
                <p className="text-muted-foreground mt-2 text-[11px]">
                  Open the list for full detail, or click a row to edit on the
                  Competitors page.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                All competitors have an address and map coordinates.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Layer comparison</h3>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Layer</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                    <TableHead className="text-right">With revenue</TableHead>
                    <TableHead className="text-right">Revenue total</TableHead>
                    <TableHead className="text-right">With address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{
                              backgroundColor: LAYER_META[row.id].color,
                            }}
                          />
                          {row.label}
                          {row.id === 'competitors' &&
                          missingItems.length > 0 ? (
                            <Link
                              href="/competitors"
                              className="text-muted-foreground hover:text-foreground text-[10px] underline-offset-2 hover:underline"
                            >
                              Fix missing
                            </Link>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.share.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.withRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.revenueTotal > 0
                          ? formatZarShort(row.revenueTotal)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.withAddress.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold">Totals</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {comparisonTotals.count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      100%
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {comparisonTotals.withRevenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {comparisonTotals.revenueTotal > 0
                        ? formatZarShort(comparisonTotals.revenueTotal)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {comparisonTotals.withAddress.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            <p className="text-muted-foreground text-xs">
              Competitor revenue is modelled monthly turnover (store count ×
              brand rate).
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
