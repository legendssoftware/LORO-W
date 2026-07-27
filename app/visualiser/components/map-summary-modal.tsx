'use client';

import { useMemo } from 'react';
import Link from 'next/link';
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
import { brandChartColor } from '@/lib/site-opportunity/compute/brands';
import type { HardwareBrandKey } from '@/api/types/site-opportunity';
import {
  getMarkerCountryKey,
  getMarkerProvinceKey,
} from '@/lib/utils/marker-geo-resolve';
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

type CountryAllocRow = {
  country: string;
  countryLabel: string;
  clients: number;
  competitors: number;
  competitorRevenue: number;
};

type ProvinceAllocRow = {
  province: string;
  clients: number;
  competitors: number;
  branches: number;
};

function pointGeoMarker(point: VisualiserMapPoint) {
  return {
    address: point.address,
    latitude: point.latitude,
    longitude: point.longitude,
    name: point.name,
  };
}

function takeTopNByTotal<
  T extends { clients: number; competitors: number; branches?: number },
>(
  rows: T[],
  n: number,
  makeOther: (totals: {
    clients: number;
    competitors: number;
    branches: number;
  }) => T,
): T[] {
  if (rows.length <= n) return rows;
  const sorted = [...rows].sort((a, b) => {
    const totalA = a.clients + a.competitors + (a.branches ?? 0);
    const totalB = b.clients + b.competitors + (b.branches ?? 0);
    return totalB - totalA;
  });
  const head = sorted.slice(0, n);
  const rest = sorted.slice(n);
  const totals = rest.reduce(
    (acc, row) => ({
      clients: acc.clients + row.clients,
      competitors: acc.competitors + row.competitors,
      branches: acc.branches + (row.branches ?? 0),
    }),
    { clients: 0, competitors: 0, branches: 0 },
  );
  if (totals.clients + totals.competitors + totals.branches <= 0) return head;
  return [...head, makeOther(totals)];
}

function countryAxisLabel(country: string): string {
  const flag = getCountryFlag(
    normalizeCountryToken(country) ?? country,
  ).flag;
  return `${flag} ${country}`;
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

  const barData = useMemo(
    () =>
      LAYER_ORDER.map((id) => ({
        layer: LAYER_META[id].label,
        count: counts[id],
        fill: LAYER_META[id].color,
      })),
    [counts],
  );

  const barConfig = useMemo(() => {
    const config: ChartConfig = {
      count: { label: 'Mapped points', color: 'var(--chart-1)' },
    };
    for (const row of barData) {
      config[row.layer] = { label: row.layer, color: row.fill };
    }
    return config;
  }, [barData]);

  const competitorBrandChart = useMemo(() => {
    const byBrand = new Map<
      HardwareBrandKey | 'UNKNOWN',
      { count: number; revenue: number }
    >();
    for (const point of points) {
      if (point.layer !== 'competitors') continue;
      const brand = (point.brandKey as HardwareBrandKey | null) ?? 'UNKNOWN';
      const prev = byBrand.get(brand) ?? { count: 0, revenue: 0 };
      const rev =
        point.estimatedAnnualRevenue != null &&
        Number.isFinite(point.estimatedAnnualRevenue)
          ? Number(point.estimatedAnnualRevenue)
          : 0;
      byBrand.set(brand, {
        count: prev.count + 1,
        revenue: prev.revenue + rev,
      });
    }
    return [...byBrand.entries()]
      .map(([brand, row]) => ({
        brand: brand === 'UNKNOWN' ? 'Other' : brand,
        count: row.count,
        revenue: row.revenue,
        fill:
          brand === 'UNKNOWN'
            ? LAYER_META.competitors.color
            : brandChartColor(brand),
      }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  }, [points]);

  const competitorBrandConfig = useMemo(() => {
    const config: ChartConfig = {
      count: { label: 'Stores', color: LAYER_META.competitors.color },
      revenue: { label: 'Est. revenue', color: 'hsl(38 92% 45%)' },
    };
    for (const row of competitorBrandChart) {
      config[row.brand] = { label: row.brand, color: row.fill };
    }
    return config;
  }, [competitorBrandChart]);

  const competitorRevenueTotal = useMemo(
    () =>
      points
        .filter((p) => p.layer === 'competitors')
        .reduce((sum, p) => {
          const rev = p.estimatedAnnualRevenue;
          return sum + (rev != null && Number.isFinite(rev) ? Number(rev) : 0);
        }, 0),
    [points],
  );

  const countryData = useMemo(() => {
    const byCountry = new Map<string, CountryAllocRow>();
    for (const point of points) {
      if (point.layer !== 'clients' && point.layer !== 'competitors') continue;
      const country = getMarkerCountryKey(pointGeoMarker(point));
      const row = byCountry.get(country) ?? {
        country,
        countryLabel: countryAxisLabel(country),
        clients: 0,
        competitors: 0,
        competitorRevenue: 0,
      };
      if (point.layer === 'clients') row.clients += 1;
      else {
        row.competitors += 1;
        const rev = point.estimatedAnnualRevenue;
        if (rev != null && Number.isFinite(rev)) {
          row.competitorRevenue += Number(rev);
        }
      }
      byCountry.set(country, row);
    }
    return takeTopNByTotal(
      Array.from(byCountry.values()),
      GEO_TOP_N,
      (totals) => ({
        country: 'Other',
        countryLabel: countryAxisLabel('Other'),
        clients: totals.clients,
        competitors: totals.competitors,
        competitorRevenue: 0,
      }),
    );
  }, [points]);

  const countryConfig: ChartConfig = {
    clients: {
      label: LAYER_META.clients.label,
      color: LAYER_META.clients.color,
    },
    competitors: {
      label: LAYER_META.competitors.label,
      color: LAYER_META.competitors.color,
    },
  };

  const provinceData = useMemo(() => {
    const byProvince = new Map<string, ProvinceAllocRow>();
    for (const point of points) {
      const isBranchLike =
        point.layer === 'branches' || point.layer === 'hq';
      if (
        point.layer !== 'clients' &&
        point.layer !== 'competitors' &&
        !isBranchLike
      ) {
        continue;
      }
      const province = getMarkerProvinceKey(pointGeoMarker(point));
      const row = byProvince.get(province) ?? {
        province,
        clients: 0,
        competitors: 0,
        branches: 0,
      };
      if (point.layer === 'clients') row.clients += 1;
      else if (point.layer === 'competitors') row.competitors += 1;
      else row.branches += 1;
      byProvince.set(province, row);
    }
    return takeTopNByTotal(
      Array.from(byProvince.values()),
      GEO_TOP_N,
      (totals) => ({
        province: 'Other',
        clients: totals.clients,
        competitors: totals.competitors,
        branches: totals.branches,
      }),
    );
  }, [points]);

  const provinceConfig: ChartConfig = {
    clients: {
      label: LAYER_META.clients.label,
      color: LAYER_META.clients.color,
    },
    competitors: {
      label: LAYER_META.competitors.label,
      color: LAYER_META.competitors.color,
    },
    branches: {
      label: LAYER_META.branches.label,
      color: LAYER_META.branches.color,
    },
  };

  const comparisonRows = useMemo(
    () =>
      LAYER_ORDER.map((id) => {
        const layerPoints = points.filter((p) => p.layer === id);
        const revenueTotal = layerPoints.reduce((sum, p) => {
          const rev = p.estimatedAnnualRevenue;
          return sum + (rev != null && Number.isFinite(rev) ? Number(rev) : 0);
        }, 0);
        return {
          id,
          label: LAYER_META[id].label,
          count: counts[id],
          share: total > 0 ? (counts[id] / total) * 100 : 0,
          withRevenue: layerPoints.filter((p) => Boolean(p.metricValue)).length,
          revenueTotal,
          withAddress: layerPoints.filter((p) => Boolean(p.address)).length,
        };
      }),
    [counts, points, total],
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[80vw] max-w-[80vw] flex-col overflow-hidden sm:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle>Map data summary</DialogTitle>
          <DialogDescription>
            Snapshot of {total.toLocaleString()} mapped locations across layers.
            {competitorRevenueTotal > 0
              ? ` Competitor est. revenue ${formatZarShort(competitorRevenueTotal)}.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Points by layer</h3>
              <ChartContainer
                config={barConfig}
                className="aspect-auto h-[240px] w-full"
              >
                <BarChart
                  data={barData}
                  margin={{ left: 8, right: 8, top: 24 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="layer" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={4}>
                    {barData.map((row) => (
                      <Cell key={row.layer} fill={row.fill} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="top"
                      className="fill-foreground text-[10px]"
                      formatter={(v: number) => formatBarCount(v)}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                Competitors by brand — count &amp; revenue
              </h3>
              {competitorBrandChart.length > 0 ? (
                <ChartContainer
                  config={competitorBrandConfig}
                  className="aspect-auto h-[240px] w-full"
                >
                  <BarChart
                    data={competitorBrandChart}
                    margin={{ left: 8, right: 8, top: 28, bottom: 8 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="brand"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      interval={0}
                      angle={competitorBrandChart.length > 4 ? -20 : 0}
                      textAnchor={
                        competitorBrandChart.length > 4 ? 'end' : 'middle'
                      }
                      height={competitorBrandChart.length > 4 ? 56 : 28}
                      fontSize={10}
                    />
                    <YAxis
                      yAxisId="count"
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="revenue"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v: number) =>
                        formatZarShort(v).replace('R ', '')
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => {
                            if (name === 'revenue' && typeof value === 'number') {
                              return formatZarShort(value);
                            }
                            return typeof value === 'number'
                              ? value.toLocaleString()
                              : String(value);
                          }}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      yAxisId="count"
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={4}
                      name="Stores"
                    >
                      <LabelList
                        dataKey="count"
                        position="top"
                        className="fill-foreground text-[9px]"
                        formatter={(v: number) => formatBarCount(v)}
                      />
                    </Bar>
                    <Bar
                      yAxisId="revenue"
                      dataKey="revenue"
                      fill="var(--color-revenue)"
                      radius={4}
                      name="Est. revenue"
                    >
                      <LabelList
                        dataKey="revenue"
                        position="top"
                        className="fill-foreground text-[9px]"
                        formatter={(v: number) => formatBarRevenue(v)}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No competitor revenue data on the map.
                </p>
              )}
              {competitorRevenueTotal > 0 ? (
                <p className="text-muted-foreground text-xs">
                  Total competitor est. revenue:{' '}
                  <span className="text-foreground font-semibold tabular-nums">
                    {formatZarShort(competitorRevenueTotal)}
                  </span>
                </p>
              ) : null}
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                Clients &amp; competitors by country
              </h3>
              {countryData.length > 0 ? (
                <ChartContainer
                  config={countryConfig}
                  className="aspect-auto h-[260px] w-full"
                >
                  <BarChart
                    data={countryData}
                    accessibilityLayer
                    margin={{ left: 8, right: 8, top: 24, bottom: 8 }}
                    barCategoryGap="20%"
                    barGap={4}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="countryLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={0}
                      angle={countryData.length > 5 ? -25 : 0}
                      textAnchor={countryData.length > 5 ? 'end' : 'middle'}
                      height={countryData.length > 5 ? 72 : 40}
                      tick={
                        <CountryTick
                          angle={countryData.length > 5 ? -25 : 0}
                        />
                      }
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="clients"
                      fill="var(--color-clients)"
                      radius={4}
                    >
                      <LabelList
                        dataKey="clients"
                        position="top"
                        className="fill-foreground text-[9px]"
                        formatter={(v: number) => formatBarCount(v)}
                      />
                    </Bar>
                    <Bar
                      dataKey="competitors"
                      fill="var(--color-competitors)"
                      radius={4}
                    >
                      <LabelList
                        dataKey="competitors"
                        position="top"
                        className="fill-foreground text-[9px]"
                        formatter={(v: number) => formatBarCount(v)}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No client or competitor locations mapped.
                </p>
              )}
            </section>

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
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Clients, competitors &amp; branches by province
            </h3>
            {provinceData.length > 0 ? (
              <ChartContainer
                config={provinceConfig}
                className="aspect-auto h-[280px] w-full"
              >
                <BarChart
                  data={provinceData}
                  accessibilityLayer
                  margin={{ left: 8, right: 8, top: 24, bottom: 8 }}
                  barCategoryGap="18%"
                  barGap={3}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="province"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval={0}
                    angle={provinceData.length > 4 ? -30 : 0}
                    textAnchor={provinceData.length > 4 ? 'end' : 'middle'}
                    height={provinceData.length > 4 ? 72 : 32}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="clients"
                    fill="var(--color-clients)"
                    radius={4}
                  >
                    <LabelList
                      dataKey="clients"
                      position="top"
                      className="fill-foreground text-[9px]"
                      formatter={(v: number) => formatBarCount(v)}
                    />
                  </Bar>
                  <Bar
                    dataKey="competitors"
                    fill="var(--color-competitors)"
                    radius={4}
                  >
                    <LabelList
                      dataKey="competitors"
                      position="top"
                      className="fill-foreground text-[9px]"
                      formatter={(v: number) => formatBarCount(v)}
                    />
                  </Bar>
                  <Bar
                    dataKey="branches"
                    fill="var(--color-branches)"
                    radius={4}
                  >
                    <LabelList
                      dataKey="branches"
                      position="top"
                      className="fill-foreground text-[9px]"
                      formatter={(v: number) => formatBarCount(v)}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-sm">
                No client, competitor, or branch locations mapped.
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
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
