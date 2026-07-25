'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getMarkerCountryKey,
  getMarkerProvinceKey,
} from '@/lib/utils/marker-geo-resolve';
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
  clients: number;
  competitors: number;
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

function takeTopNByTotal<T extends { clients: number; competitors: number; branches?: number }>(
  rows: T[],
  n: number,
  makeOther: (totals: {
    clients: number;
    competitors: number;
    branches: number;
  }) => T
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
    { clients: 0, competitors: 0, branches: 0 }
  );
  if (totals.clients + totals.competitors + totals.branches <= 0) return head;
  return [...head, makeOther(totals)];
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

  const barData = useMemo(
    () =>
      LAYER_ORDER.map((id) => ({
        layer: LAYER_META[id].label,
        count: counts[id],
        fill: LAYER_META[id].color,
      })),
    [counts]
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

  const countryData = useMemo(() => {
    const byCountry = new Map<string, CountryAllocRow>();
    for (const point of points) {
      if (point.layer !== 'clients' && point.layer !== 'competitors') continue;
      const country = getMarkerCountryKey(pointGeoMarker(point));
      const row = byCountry.get(country) ?? {
        country,
        clients: 0,
        competitors: 0,
      };
      if (point.layer === 'clients') row.clients += 1;
      else row.competitors += 1;
      byCountry.set(country, row);
    }
    return takeTopNByTotal(
      Array.from(byCountry.values()),
      GEO_TOP_N,
      (totals) => ({
        country: 'Other',
        clients: totals.clients,
        competitors: totals.competitors,
      })
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
      })
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
      LAYER_ORDER.map((id) => ({
        id,
        label: LAYER_META[id].label,
        count: counts[id],
        share: total > 0 ? (counts[id] / total) * 100 : 0,
        withRevenue: points.filter(
          (p) => p.layer === id && Boolean(p.metricValue)
        ).length,
        withAddress: points.filter(
          (p) => p.layer === id && Boolean(p.address)
        ).length,
      })),
    [counts, points, total]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[80vw] max-w-[80vw] flex-col overflow-hidden sm:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle>Map data summary</DialogTitle>
          <DialogDescription>
            Snapshot of {total.toLocaleString()} mapped locations across layers.
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
                <BarChart data={barData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="layer" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={4}>
                    {barData.map((row) => (
                      <Cell key={row.layer} fill={row.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                Clients & competitors by country
              </h3>
              {countryData.length > 0 ? (
                <ChartContainer
                  config={countryConfig}
                  className="aspect-auto h-[240px] w-full"
                >
                  <BarChart
                    data={countryData}
                    accessibilityLayer
                    margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                    barCategoryGap="20%"
                    barGap={4}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="country"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={0}
                      angle={countryData.length > 5 ? -25 : 0}
                      textAnchor={countryData.length > 5 ? 'end' : 'middle'}
                      height={countryData.length > 5 ? 64 : 32}
                    />
                    <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="clients"
                      fill="var(--color-clients)"
                      radius={4}
                    />
                    <Bar
                      dataKey="competitors"
                      fill="var(--color-competitors)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No client or competitor locations mapped.
                </p>
              )}
            </section>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Clients, competitors & branches by province
            </h3>
            {provinceData.length > 0 ? (
              <ChartContainer
                config={provinceConfig}
                className="aspect-auto h-[280px] w-full"
              >
                <BarChart
                  data={provinceData}
                  accessibilityLayer
                  margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
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
                  <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="clients"
                    fill="var(--color-clients)"
                    radius={4}
                  />
                  <Bar
                    dataKey="competitors"
                    fill="var(--color-competitors)"
                    radius={4}
                  />
                  <Bar
                    dataKey="branches"
                    fill="var(--color-branches)"
                    radius={4}
                  />
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
                        {row.withAddress.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
