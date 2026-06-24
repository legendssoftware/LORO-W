'use client';

import { useMutation } from '@tanstack/react-query';
import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Building2,
  Download,
  LayoutGrid,
  Loader2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { downloadOpportunitiesCsv } from '@/lib/site-opportunity';
import { getPotentialBreakdown } from '@/lib/site-opportunity/format-potential';
import { buildTurnoverSimulation } from '@/lib/site-opportunity/turnover-simulation';
import {
  DEFAULT_SITE_OPPORTUNITY_SETTINGS,
  type BranchCatchmentOpportunity,
  type CaptureTimelinePoint,
  type DataQualitySummary,
  type GreenfieldOpportunityZone,
  type SiteOpportunitySettings,
  type SiteOpportunityZone,
} from '@/api/types/site-opportunity';
import {
  reportsTabTriggerClassName,
  reportsTabsListCompactClassName,
} from '@/app/reports/reports-tab-styles';
import { cn } from '@/lib/utils';
import { useOrgName } from '@/lib/org-id-context';

const PANEL_TABS = [
  { value: 'all', label: 'All', Icon: LayoutGrid },
  { value: 'catchment', label: 'Branches', Icon: Building2 },
  { value: 'greenfield', label: 'New', Icon: MapPin },
] as const;

function formatZar(n: number): string {
  if (n >= 1_000_000) return `R ${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `R ${(n / 1_000).toFixed(0)}k`;
  return `R ${Math.round(n).toLocaleString()}`;
}

function formatChartZarAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

function CaptureTimelineChart({ data }: { data: CaptureTimelinePoint[] }) {
  const maxRevenue = Math.max(
    ...data.map((d) => d.revenueHighZAR),
    1
  );
  return (
    <div className="h-[160px] w-full min-w-0 mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10 }}
            tickFormatter={(m) => `${m}m`}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={formatChartZarAxis}
            width={36}
            domain={[0, maxRevenue * 1.1]}
          />
          <Tooltip
            formatter={(v: number) => formatZar(v)}
            labelFormatter={(m) => `Month ${m}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 10 }}
            formatter={(value) =>
              value === 'revenueLowZAR'
                ? 'Low'
                : value === 'revenueMidZAR'
                  ? 'Expected'
                  : 'High'
            }
          />
          <Line
            type="monotone"
            dataKey="revenueLowZAR"
            name="revenueLowZAR"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 3"
          />
          <Line
            type="monotone"
            dataKey="revenueMidZAR"
            name="revenueMidZAR"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="revenueHighZAR"
            name="revenueHighZAR"
            stroke="#16a34a"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 3"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TurnoverSimulatorSection({ zone }: { zone: SiteOpportunityZone }) {
  const simulation = buildTurnoverSimulation(zone);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3 min-w-0">
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Monthly turnover simulator
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Derived from competitor pool · mature mid{' '}
          {formatZar(simulation.matureMidMonthlyZAR)}/mo (
          {formatZar(simulation.matureMidAnnualZAR)}/yr)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-0">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="pb-1.5 pr-2 font-medium">Scenario</th>
              <th className="pb-1.5 pr-2 font-medium">Monthly</th>
              <th className="pb-1.5 font-medium">Annual</th>
            </tr>
          </thead>
          <tbody>
            {simulation.scenarios.map((s) => (
              <tr key={s.key} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 pr-2">{s.label}</td>
                <td className="py-1.5 pr-2 font-medium tabular-nums">
                  {formatZar(s.monthlyZAR)}
                </td>
                <td className="py-1.5 font-medium tabular-nums text-muted-foreground">
                  {formatZar(s.annualZAR)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">
          Capture milestones (monthly)
        </p>
        <div className="space-y-1">
          {simulation.milestones.map((m) => (
            <div
              key={m.month}
              className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs"
            >
              <span className="text-muted-foreground shrink-0">{m.label}</span>
              <span className="font-medium tabular-nums text-right">
                {formatZar(m.midMonthlyZAR)}
                <span className="text-muted-foreground font-normal ml-1">
                  ({formatZar(m.lowMonthlyZAR)}–{formatZar(m.highMonthlyZAR)})
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">
          Product mix estimate (mid mature monthly)
        </p>
        <ul className="space-y-1">
          {simulation.productMix.map((line) => (
            <li
              key={line.category}
              className="flex items-baseline justify-between gap-2 text-xs min-w-0"
            >
              <span className="text-muted-foreground truncate min-w-0">
                {line.category} ({line.pct}%)
              </span>
              <span className="font-medium tabular-nums shrink-0">
                {formatZar(line.monthlyZAR)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ZoneDetail({
  zone,
  captureSettings,
  orgBrandName,
  onExplain,
  explainLoading,
  brief,
}: {
  zone: SiteOpportunityZone;
  captureSettings: SiteOpportunitySettings;
  orgBrandName: string;
  onExplain: () => void;
  explainLoading: boolean;
  brief: SiteOpportunityBrief | null;
}) {
  const lowPct = Math.round(captureSettings.captureLowPct * 100);
  const highPct = Math.round(captureSettings.captureHighPct * 100);
  const title =
    zone.kind === 'catchment' ? zone.branchName : zone.label;
  const potential = getPotentialBreakdown(
    zone.potentialLowZAR,
    zone.potentialHighZAR,
  );

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            #{zone.rank} · {zone.kind === 'catchment' ? 'Branch catchment' : 'New site'}
          </p>
          <h3 className="font-semibold text-foreground break-words">{title}</h3>
          {zone.kind === 'greenfield' && zone.address ? (
            <p className="text-sm text-muted-foreground mt-0.5 break-words">
              {zone.address}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onExplain}
          disabled={explainLoading}
          className="shrink-0"
        >
          {explainLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          <span className="ml-1.5 hidden sm:inline">Explain with AI</span>
          <span className="ml-1.5 sm:hidden">AI</span>
        </Button>
      </div>

      <TurnoverSimulatorSection zone={zone} />

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm min-w-0">
        <div>
          <dt className="text-muted-foreground">Clients in radius</dt>
          <dd className="font-medium">{zone.clientCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Competitors</dt>
          <dd className="font-medium">{zone.competitorCount}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Addressable pool (monthly)</dt>
          <dd className="font-medium">
            {formatZar(zone.addressablePoolZAR)}/mo
            <span className="block text-xs font-normal text-muted-foreground">
              Σ hardware in {captureSettings.radiusMeters / 1000} km × brand monthly turnover
            </span>
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">
            {orgBrandName} potential ({lowPct}–{highPct}%, monthly)
          </dt>
          <dd className="font-medium space-y-0.5">
            <span className="block">Low: {formatZar(potential.low)}/mo</span>
            <span className="block">Avg: {formatZar(potential.avg)}/mo</span>
            <span className="block">High: {formatZar(potential.high)}/mo</span>
          </dd>
        </div>
        {zone.kind === 'catchment' && zone.actualRevenueZAR != null ? (
          <>
            <div>
              <dt className="text-muted-foreground">Actual ERP revenue</dt>
              <dd className="font-medium">{formatZar(zone.actualRevenueZAR)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Gap to high potential</dt>
              <dd
                className={cn(
                  'font-medium',
                  (zone.revenueGapZAR ?? 0) > 0 ? 'text-amber-700' : 'text-green-700'
                )}
              >
                {zone.revenueGapZAR != null ? formatZar(zone.revenueGapZAR) : '—'}
              </dd>
            </div>
          </>
        ) : null}
        {zone.kind === 'greenfield' && zone.nearestBranchKm != null ? (
          <div className="col-span-2">
            <dt className="text-muted-foreground">Nearest {orgBrandName} branch</dt>
            <dd className="font-medium">{zone.nearestBranchKm.toFixed(1)} km</dd>
          </div>
        ) : null}
      </dl>

      {zone.byBrand.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {zone.byBrand.map((b) => (
            <Badge key={b.brand} variant="secondary" className="text-xs">
              {b.brand} ×{b.count}
            </Badge>
          ))}
        </div>
      ) : null}

      {zone.monthsToTargetMid != null ? (
        <p className="text-xs text-muted-foreground">
          Mid-scenario ramp reaches ~55% of full potential by month{' '}
          {zone.monthsToTargetMid}.
        </p>
      ) : null}

      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          Market capture ramp (monthly turnover)
        </p>
        <CaptureTimelineChart data={zone.captureTimeline} />
      </div>

      {brief ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="size-4" />
              AI brief
              <Badge variant="outline" className="ml-auto capitalize">
                {brief.recommendation}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 text-sm space-y-2">
            <p>{brief.summary}</p>
            {brief.strengths.length > 0 ? (
              <ul className="list-disc pl-4 text-muted-foreground">
                {brief.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
            {brief.risks.length > 0 ? (
              <ul className="list-disc pl-4 text-amber-800">
                {brief.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ZoneListItem({
  zone,
  selected,
  onSelect,
}: {
  zone: SiteOpportunityZone;
  selected: boolean;
  onSelect: () => void;
}) {
  const title = zone.kind === 'catchment' ? zone.branchName : zone.label;
  const simulation = buildTurnoverSimulation(zone);
  const subtitle =
    zone.kind === 'greenfield' && zone.address
      ? `${formatZar(simulation.listSubtitleMonthlyZAR)}/mo expected · ${zone.address}`
      : `${zone.competitorCount} competitors · ${formatZar(simulation.listSubtitleMonthlyZAR)}/mo expected`;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full max-w-full min-w-0 text-left rounded-lg border px-3 py-2.5 transition-colors overflow-hidden',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:bg-muted/50'
      )}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="font-medium text-sm truncate min-w-0 flex-1">{title}</span>
        <Badge variant="outline" className="shrink-0">
          #{zone.rank}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
        {subtitle}
      </p>
    </button>
  );
}

export interface SiteOpportunityBrief {
  summary: string;
  strengths: string[];
  risks: string[];
  recommendation: 'strong' | 'moderate' | 'weak';
  suggestedNextSteps: string[];
  estimatedRampMonths: number;
}

async function fetchSiteBrief(payload: unknown): Promise<SiteOpportunityBrief> {
  const res = await fetch('/api/site-opportunities/brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === 'string' ? err.error : 'Could not generate AI brief'
    );
  }
  return res.json();
}

export function SiteOpportunityPanel({
  catchments,
  greenfield,
  dataQuality,
  warnings = [],
  captureSettings = DEFAULT_SITE_OPPORTUNITY_SETTINGS,
  selectedZoneId,
  onSelectZone,
  className,
  isLoading = false,
  isError = false,
  hasLoadedData = true,
  errorMessage,
}: {
  catchments: BranchCatchmentOpportunity[];
  greenfield: GreenfieldOpportunityZone[];
  dataQuality: DataQualitySummary;
  warnings?: string[];
  captureSettings?: SiteOpportunitySettings;
  selectedZoneId: string | null;
  onSelectZone: (zone: SiteOpportunityZone) => void;
  className?: string;
  isLoading?: boolean;
  isError?: boolean;
  /** When false, hides coverage stats until the first server response arrives. */
  hasLoadedData?: boolean;
  errorMessage?: string;
}) {
  const orgName = useOrgName();
  const orgBrandName = orgName?.trim() || 'Your brand';

  const selectedZone =
    [...catchments, ...greenfield].find((z) => z.id === selectedZoneId) ?? null;

  const explainMutation = useMutation({
    mutationFn: fetchSiteBrief,
  });

  const lowConfidence = dataQuality.competitorCoveragePct < 95;

  return (
    <aside
      className={cn(
        'flex flex-col h-full max-h-full min-h-0 min-w-0 overflow-hidden border-l bg-background w-full lg:w-[360px] shrink-0',
        className
      )}
    >
      <div className="p-3 border-b space-y-2 shrink-0 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">Suggested areas</h2>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              downloadOpportunitiesCsv(catchments, greenfield, captureSettings)
            }
          >
            <Download className="size-4" />
            <span className="sr-only">Export CSV</span>
          </Button>
        </div>
        {!isError && hasLoadedData ? (
          <p className="text-xs text-muted-foreground">
            Based on {dataQuality.competitorsWithCoords}/
            {dataQuality.totalCompetitors} competitors with map coordinates (
            {dataQuality.competitorCoveragePct}%).
          </p>
        ) : null}
        {lowConfidence && warnings.length > 0 ? (
          <ul className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 space-y-1 list-disc pl-4">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          5 km radius · not drive time · overlapping catchments double-count at
          national level.
        </p>
      </div>

      <Tabs
        defaultValue="all"
        className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden"
      >
        <TabsList className={cn(reportsTabsListCompactClassName, 'shrink-0')}>
          {PANEL_TABS.map(({ value, label, Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={reportsTabTriggerClassName}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {(['all', 'catchment', 'greenfield'] as const).map((tab) => {
          const list =
            tab === 'all'
              ? [...catchments, ...greenfield].sort((a, b) => a.rank - b.rank)
              : tab === 'catchment'
                ? catchments
                : greenfield;

          return (
            <TabsContent
              key={tab}
              value={tab}
              className="flex-1 min-h-0 min-w-0 mt-0 overflow-y-auto overflow-x-hidden data-[state=inactive]:hidden"
            >
              <div className="p-3 space-y-2 min-w-0 max-w-full">
                {isError ? (
                  <p
                    className="text-sm text-destructive py-6 text-center px-2"
                    role="alert"
                  >
                    {errorMessage ??
                      'Could not load suggested areas from the server.'}
                  </p>
                ) : isLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mr-2" />
                    <span className="text-sm">Loading suggested areas…</span>
                  </div>
                ) : list.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No opportunities in this view.
                  </p>
                ) : (
                  list.map((zone) => (
                    <ZoneListItem
                      key={zone.id}
                      zone={zone}
                      selected={zone.id === selectedZoneId}
                      onSelect={() => onSelectZone(zone)}
                    />
                  ))
                )}
              </div>

              {selectedZone ? (
                <div className="border-t p-3 min-w-0">
                  <ZoneDetail
                    zone={selectedZone}
                    captureSettings={captureSettings}
                    orgBrandName={orgBrandName}
                    explainLoading={explainMutation.isPending}
                    brief={
                      explainMutation.data &&
                      explainMutation.variables &&
                      (explainMutation.variables as { zoneId?: string }).zoneId ===
                        selectedZone.id
                        ? explainMutation.data
                        : null
                    }
                    onExplain={() =>
                      explainMutation.mutate({
                        zoneId: selectedZone.id,
                        mode: selectedZone.kind,
                        zone: selectedZone,
                        dataQuality,
                        warnings,
                        orgBrandName,
                      })
                    }
                  />
                </div>
              ) : null}
            </TabsContent>
          );
        })}
      </Tabs>
    </aside>
  );
}
