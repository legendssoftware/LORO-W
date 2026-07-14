'use client';

import { useMemo } from 'react';
import {
  Building2,
  ClipboardList,
  Landmark,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import type { MapMarkerBase, MapOrganisationSummary } from '@/api/types/map';
import type { HardwareBrandKey } from '@/api/types/site-opportunity';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  ReportDonutChart,
  type ReportDonutSlice,
} from '@/components/charts/report-donut-chart';
import { cn } from '@/lib/utils';
import { zAboveLeafletFullscreen } from '@/lib/z-index';
import { getMarkerProvinceKey } from '@/lib/utils/map-marker-filters';
import {
  brandChartColor,
  countByBrand,
  brandTurnoverZAR,
  resolveHardwareBrand,
} from '@/lib/site-opportunity/compute/brands';

const DIALOG_WIDTH_CLASS =
  'w-[min(80vw,calc(100%-2rem))] max-w-[80vw] sm:max-w-[80vw]';

/**
 * Concrete hex fills for SVG bars (CSS `hsl(var(--chart-*))` is invalid here
 * because --chart-* tokens are already full `hsl(...)` values).
 * Competitors = warm scheme; Clients = cool scheme — intentionally distinct.
 */
const COMPETITOR_PROVINCE_BAR_COLORS = [
  '#dc2626',
  '#ea580c',
  '#f59e0b',
  '#eab308',
  '#f97316',
  '#fb7185',
  '#c2410d',
] as const;

const CLIENT_PROVINCE_BAR_COLORS = [
  '#0d9488',
  '#0891b2',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#06b6d4',
  '#059669',
] as const;

const COMPETITOR_POOL_BAR_COLOR = '#7c3aed';

function colorAt(palette: readonly string[], index: number): string {
  return palette[index % palette.length] ?? palette[0];
}

function hasValidCoords(marker: MapMarkerBase): boolean {
  const lat = Number(marker.latitude ?? marker.position?.[0]);
  const lng = Number(marker.longitude ?? marker.position?.[1]);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function countByType(
  markers: MapMarkerBase[],
  markerType: string
): { total: number; withCoords: number } {
  let total = 0;
  let withCoords = 0;
  for (const marker of markers) {
    if (String(marker.markerType ?? '') !== markerType) continue;
    total += 1;
    if (hasValidCoords(marker)) withCoords += 1;
  }
  return { total, withCoords };
}

function formatCompactZar(value: number): string {
  if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R${(value / 1_000).toFixed(0)}k`;
  return `R${value}`;
}

function HighlightCard({
  label,
  total,
  withCoords,
  detail,
  icon: Icon,
}: {
  label: string;
  total: number;
  withCoords: number;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background border border-border/80 text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </div>
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {total}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
        {withCoords} mapped
      </p>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{detail}</p>
    </div>
  );
}

const competitorProvinceConfig = {
  count: { label: 'Stores', color: COMPETITOR_PROVINCE_BAR_COLORS[0] },
  poolM: { label: 'Pool (Rm)', color: COMPETITOR_POOL_BAR_COLOR },
} satisfies ChartConfig;

const clientsProvinceConfig = {
  clients: { label: 'Clients', color: CLIENT_PROVINCE_BAR_COLORS[0] },
} satisfies ChartConfig;

export function VisualiserMapSummaryDialog({
  markers,
  organisation,
  selectedCountry,
  selectedProvince,
  triggerClassName,
}: {
  markers: MapMarkerBase[];
  organisation?: MapOrganisationSummary | null;
  selectedCountry: string;
  selectedProvince: string;
  triggerClassName?: string;
}) {
  const competitors = useMemo(
    () => countByType(markers, 'competitor'),
    [markers]
  );
  const branches = useMemo(() => countByType(markers, 'branch'), [markers]);
  const orgMarkers = useMemo(() => countByType(markers, 'org'), [markers]);
  const clients = useMemo(() => countByType(markers, 'client'), [markers]);

  const competitorMarkers = useMemo(
    () => markers.filter((m) => String(m.markerType ?? '') === 'competitor'),
    [markers]
  );
  const clientMarkers = useMemo(
    () => markers.filter((m) => String(m.markerType ?? '') === 'client'),
    [markers]
  );

  const filterParts = useMemo(() => {
    const parts: string[] = [];
    if (selectedCountry) parts.push(selectedCountry);
    else parts.push('all countries');
    if (selectedProvince) parts.push(selectedProvince);
    else if (selectedCountry) parts.push('all provinces');
    return parts;
  }, [selectedCountry, selectedProvince]);

  const brandSlices = useMemo((): ReportDonutSlice[] => {
    const brands = countByBrand(competitorMarkers);
    return brands.map((b) => ({
      id: b.brand,
      label: b.brand,
      value: b.count,
      fill: brandChartColor(b.brand),
    }));
  }, [competitorMarkers]);

  const brandChartConfig = useMemo((): ChartConfig => {
    const config: ChartConfig = {};
    for (const slice of brandSlices) {
      config[slice.id] = {
        label: slice.label,
        color: slice.fill,
      };
    }
    return config;
  }, [brandSlices]);

  const brandTotal = useMemo(
    () => brandSlices.reduce((s, row) => s + row.value, 0),
    [brandSlices]
  );

  const competitorByProvince = useMemo(() => {
    const byProvince = new Map<string, MapMarkerBase[]>();
    for (const m of competitorMarkers) {
      const key = getMarkerProvinceKey(m);
      const list = byProvince.get(key) ?? [];
      list.push(m);
      byProvince.set(key, list);
    }
    const rows = Array.from(byProvince.entries()).map(([province, list]) => {
      const pool = list.reduce((sum, m) => {
        const brand = resolveHardwareBrand(m);
        return sum + brandTurnoverZAR(brand as HardwareBrandKey);
      }, 0);
      return {
        province,
        count: list.length,
        poolM: Math.round((pool / 1_000_000) * 10) / 10,
        poolZar: pool,
      };
    });
    rows.sort((a, b) => b.count - a.count || a.province.localeCompare(b.province));
    return rows.slice(0, 12);
  }, [competitorMarkers]);

  const clientsByProvince = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of clientMarkers) {
      const key = getMarkerProvinceKey(m);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const rows = Array.from(counts.entries()).map(([province, clientsCount]) => ({
      province,
      clients: clientsCount,
    }));
    rows.sort((a, b) => b.clients - a.clients || a.province.localeCompare(b.province));
    return rows.slice(0, 12);
  }, [clientMarkers]);

  /** Stacked store counts: province × brand for the filtered country view. */
  const storesByProvinceByBrand = useMemo(() => {
    const byProvince = new Map<string, Map<HardwareBrandKey, number>>();
    const brandTotals = new Map<HardwareBrandKey, number>();

    for (const m of competitorMarkers) {
      const province = getMarkerProvinceKey(m);
      const brand = resolveHardwareBrand(m);
      const brandMap = byProvince.get(province) ?? new Map();
      brandMap.set(brand, (brandMap.get(brand) ?? 0) + 1);
      byProvince.set(province, brandMap);
      brandTotals.set(brand, (brandTotals.get(brand) ?? 0) + 1);
    }

    const brands = Array.from(brandTotals.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([brand]) => brand);

    const rows = Array.from(byProvince.entries()).map(([province, brandMap]) => {
      const row: Record<string, string | number> = { province };
      let total = 0;
      for (const brand of brands) {
        const count = brandMap.get(brand) ?? 0;
        row[brand] = count;
        total += count;
      }
      row.total = total;
      return row;
    });

    rows.sort(
      (a, b) =>
        Number(b.total) - Number(a.total) ||
        String(a.province).localeCompare(String(b.province))
    );

    const config: ChartConfig = {};
    for (const brand of brands) {
      config[brand] = {
        label: brand,
        color: brandChartColor(brand),
      };
    }

    return {
      rows: rows.slice(0, 12),
      brands,
      config,
    };
  }, [competitorMarkers]);

  const summaryText = useMemo(() => {
    const orgName = organisation?.name?.trim() || 'your organisation';
    const scope = filterParts.join(' · ');
    const mappedCompetitors = competitors.withCoords;
    const mappedBranches = branches.withCoords;
    const orgOnMap =
      orgMarkers.total > 0
        ? `HQ is on the map${organisation?.name ? ` (${organisation.name})` : ''}.`
        : organisation?.name
          ? `${organisation.name} has no HQ pin in this filtered view.`
          : 'No organisation HQ pin in this filtered view.';

    return `${orgName} map shows ${mappedCompetitors} competitor${mappedCompetitors === 1 ? '' : 's'} and ${mappedBranches} branch${mappedBranches === 1 ? '' : 'es'} with coordinates for ${scope}. ${orgOnMap}`;
  }, [
    organisation,
    filterParts,
    competitors.withCoords,
    branches.withCoords,
    orgMarkers.total,
  ]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(triggerClassName)}
          aria-label="Map summary"
        >
          <ClipboardList className="size-4 mr-1.5" />
          Summary
        </Button>
      </DialogTrigger>
      <DialogContent
        overlayClassName={zAboveLeafletFullscreen}
        className={cn(
          zAboveLeafletFullscreen,
          DIALOG_WIDTH_CLASS,
          'flex flex-col gap-4 max-h-[90vh] overflow-y-auto'
        )}
      >
        <DialogHeader className="!text-left">
          <DialogTitle>Map summary</DialogTitle>
          <DialogDescription>
            Allocations for the current Competitor Overview filters.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HighlightCard
            label="Competitors"
            total={competitors.total}
            withCoords={competitors.withCoords}
            detail="Hardware stores and rival sites on the map"
            icon={Store}
          />
          <HighlightCard
            label="Branches"
            total={branches.total}
            withCoords={branches.withCoords}
            detail="Your organisation branch locations"
            icon={Building2}
          />
          <HighlightCard
            label="Organisation"
            total={orgMarkers.total}
            withCoords={orgMarkers.withCoords}
            detail={
              organisation?.name
                ? `HQ marker for ${organisation.name}`
                : 'Organisation HQ marker'
            }
            icon={Landmark}
          />
          <HighlightCard
            label="Clients"
            total={clients.total}
            withCoords={clients.withCoords}
            detail="Customer sites in this filtered view"
            icon={Users}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border/80 p-3 min-w-0">
            <p className="text-sm font-medium text-foreground mb-2">
              Competitor composition
            </p>
            {brandSlices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No competitors in this view.
              </p>
            ) : (
              <ReportDonutChart
                config={brandChartConfig}
                data={brandSlices}
                centerPrimary={String(brandTotal)}
                centerSecondary="Stores"
              />
            )}
          </div>

          <div className="rounded-lg border border-border/80 p-3 min-w-0">
            <p className="text-sm font-medium text-foreground mb-2">
              Competitors by province
            </p>
            {competitorByProvince.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No competitor provinces in this view.
              </p>
            ) : (
              <ChartContainer
                config={competitorProvinceConfig}
                className="aspect-auto h-[260px] w-full min-w-0"
              >
                <BarChart
                  data={competitorByProvince}
                  accessibilityLayer
                  margin={{ left: 4, right: 8, top: 12, bottom: 48 }}
                  barCategoryGap="12%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="province"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={64}
                  />
                  <YAxis
                    yAxisId="count"
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="pool"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tickFormatter={(v) => `${v}`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, item) => {
                          const row = item?.payload as
                            | { poolZar?: number; count?: number }
                            | undefined;
                          if (name === 'poolM' && row?.poolZar != null) {
                            return (
                              <span className="font-mono tabular-nums">
                                {formatCompactZar(row.poolZar)} pool
                              </span>
                            );
                          }
                          return (
                            <span className="font-mono tabular-nums">
                              {String(value)}{' '}
                              {name === 'count' ? 'stores' : ''}
                            </span>
                          );
                        }}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    yAxisId="count"
                    dataKey="count"
                    fill={COMPETITOR_PROVINCE_BAR_COLORS[0]}
                    radius={[4, 4, 0, 0]}
                  >
                    {competitorByProvince.map((entry, index) => (
                      <Cell
                        key={entry.province}
                        fill={colorAt(COMPETITOR_PROVINCE_BAR_COLORS, index)}
                      />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="top"
                      className="fill-foreground text-[10px]"
                    />
                  </Bar>
                  <Bar
                    yAxisId="pool"
                    dataKey="poolM"
                    fill={COMPETITOR_POOL_BAR_COLOR}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </div>

          <div className="rounded-lg border border-border/80 p-3 min-w-0">
            <p className="text-sm font-medium text-foreground mb-1">
              Stores by province
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Competitor store counts per province, stacked by brand
              {selectedCountry ? ` · ${selectedCountry}` : ''}.
            </p>
            {storesByProvinceByBrand.rows.length === 0 ||
            storesByProvinceByBrand.brands.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No competitor stores by province in this view.
              </p>
            ) : (
              <ChartContainer
                config={storesByProvinceByBrand.config}
                className="aspect-auto h-[300px] w-full min-w-0"
              >
                <BarChart
                  data={storesByProvinceByBrand.rows}
                  accessibilityLayer
                  margin={{ left: 4, right: 8, top: 12, bottom: 48 }}
                  barCategoryGap="12%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="province"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={64}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <span className="font-mono tabular-nums">
                            {String(value)} {String(name)}
                          </span>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {storesByProvinceByBrand.brands.map((brand, index) => {
                    const isTop =
                      index === storesByProvinceByBrand.brands.length - 1;
                    return (
                      <Bar
                        key={brand}
                        dataKey={brand}
                        stackId="brands"
                        fill={brandChartColor(brand)}
                        radius={isTop ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    );
                  })}
                </BarChart>
              </ChartContainer>
            )}
          </div>

          <div className="rounded-lg border border-border/80 p-3 min-w-0">
            <p className="text-sm font-medium text-foreground mb-2">
              Clients per province
            </p>
            {clientsByProvince.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No clients in this view.
              </p>
            ) : (
              <ChartContainer
                config={clientsProvinceConfig}
                className="aspect-auto h-[260px] w-full min-w-0"
              >
                <BarChart
                  data={clientsByProvince}
                  accessibilityLayer
                  margin={{ left: 4, right: 8, top: 16, bottom: 48 }}
                  barCategoryGap="10%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="province"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={64}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar
                    dataKey="clients"
                    fill={CLIENT_PROVINCE_BAR_COLORS[0]}
                    radius={[4, 4, 0, 0]}
                  >
                    {clientsByProvince.map((entry, index) => (
                      <Cell
                        key={entry.province}
                        fill={colorAt(CLIENT_PROVINCE_BAR_COLORS, index)}
                      />
                    ))}
                    <LabelList
                      dataKey="clients"
                      position="top"
                      className="fill-foreground text-[10px]"
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Filters
          </p>
          <p className="text-sm text-foreground">{filterParts.join(' · ')}</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Summary
          </p>
          <p className="text-sm text-foreground leading-relaxed">{summaryText}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
