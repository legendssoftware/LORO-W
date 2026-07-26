'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  RotateCcw,
  Settings2,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useBranches, useClientsMapData } from '@/api/hooks';
import { useCompetitorsMapData } from '@/api/hooks/use-competitors-map-data';
import { useStoresSales } from '@/api/hooks/use-stores-sales';
import { useVisualiserSimulation } from '@/app/visualiser/simulation-context';
import { SimulationTrendChart } from '@/app/visualiser/components/simulation-trend-chart';
import { ZoneExplainAiButton } from '@/app/visualiser/components/zone-explain-ai-button';
import {
  DEFAULT_SITE_OPPORTUNITY_SETTINGS,
  type HardwareBrandKey,
  type SiteOpportunitySettings,
  type SiteOpportunityZone,
  type TurnoverOverrideSettings,
} from '@/api/types/site-opportunity';
import { computeSiteOpportunities } from '@/lib/site-opportunity/compute';
import { buildOpportunityMarkers } from '@/lib/site-opportunity/build-opportunity-markers';
import { enrichCatchmentsWithDashboardRevenue } from '@/lib/site-opportunity/enrich-catchment-revenue';
import { applyTurnoverOverridesToZone } from '@/lib/site-opportunity/apply-turnover-overrides';
import {
  buildTurnoverSimulation,
  branchSimulationTextClass,
  type TurnoverSimulation,
} from '@/lib/site-opportunity/turnover-simulation';
import { formatZarShort } from '@/lib/site-opportunity/format-potential';
import { matureShareByCompetition } from '@/lib/site-opportunity/compute/capture-phases';
import { HARDWARE_TURNOVER_ZAR } from '@/lib/site-opportunity/compute/brands';
import { listCompetitorsInZone } from '@/lib/site-opportunity/zone-competitors';
import {
  loadVisualiserPreferences,
  saveVisualiserPreferences,
} from '@/lib/visualiser-preferences';
import {
  currentMonthLabel,
  monthlyDateRange,
} from '@/lib/utils/sales-per-store-match';
import { cn } from '@/lib/utils';

const EDITABLE_BRANDS: HardwareBrandKey[] = [
  'BUCO',
  'CASHBUILD',
  'BUILD IT',
  'BUILDERS',
  'POWERBUILD',
  'EST',
];

function seedBrandTurnovers(
  overrides?: TurnoverOverrideSettings,
): Record<HardwareBrandKey, number> {
  const next = { ...HARDWARE_TURNOVER_ZAR };
  const brandOverrides = overrides?.brandTurnoverOverrides ?? {};
  for (const brand of EDITABLE_BRANDS) {
    const value = brandOverrides[brand];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      next[brand] = value;
    }
  }
  return next;
}

function ZoneDetailBody({
  zone,
  detailSim,
  captureLowPctDisplay,
  captureHighPctDisplay,
  competitorsByBrand,
}: {
  zone: SiteOpportunityZone;
  detailSim: TurnoverSimulation;
  captureLowPctDisplay: number;
  captureHighPctDisplay: number;
  competitorsByBrand: Map<
    HardwareBrandKey,
    ReturnType<typeof listCompetitorsInZone>
  >;
}) {
  const monthLabel = detailSim.actualRevenueMonthLabel ?? currentMonthLabel();

  return (
    <div className="space-y-3 border-t px-2.5 py-2.5">
      <p className="text-muted-foreground text-[10px]">
        Radius {(zone.radiusMeters / 1000).toFixed(0)} km ·{' '}
        {zone.competitorCount} competitors · {zone.clientCount} clients
        {zone.monthsToTargetMid != null
          ? ` · ~${zone.monthsToTargetMid} mo to mature`
          : ''}
      </p>

      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="bg-muted/40 rounded p-1.5">
          <p className="text-muted-foreground">Addressable pool</p>
          <p className="text-xs font-semibold">
            {formatZarShort(zone.addressablePoolZAR)}
          </p>
        </div>
        <div className="bg-muted/40 rounded p-1.5">
          <p className="text-muted-foreground">
            Potential ({captureLowPctDisplay}–{captureHighPctDisplay}%)
          </p>
          <p className="text-xs font-semibold">
            {formatZarShort(zone.potentialLowZAR)} –{' '}
            {formatZarShort(zone.potentialHighZAR)}
          </p>
        </div>
        <div className="bg-muted/40 rounded p-1.5">
          <p className="text-muted-foreground">Mature mid (model)</p>
          <p className="text-xs font-semibold">
            {formatZarShort(detailSim.simulatedMonthlyZAR)}
          </p>
        </div>
        <div className="bg-muted/40 rounded p-1.5">
          <p className="text-muted-foreground">ERP actual ({monthLabel})</p>
          <p className="text-xs font-semibold">
            {detailSim.actualMonthlyZAR != null
              ? formatZarShort(detailSim.actualMonthlyZAR)
              : '—'}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium">Competitors in radius</p>
        {competitorsByBrand.size === 0 ? (
          <p className="text-muted-foreground text-[11px]">
            No geocoded competitors in this bubble.
          </p>
        ) : (
          <div className="max-h-36 space-y-2 overflow-y-auto">
            {[...competitorsByBrand.entries()].map(([brand, stores]) => (
              <div key={brand}>
                <p className="text-muted-foreground text-[10px] font-medium">
                  {brand} ({stores.length})
                </p>
                <ul className="mt-0.5 space-y-1">
                  {stores.map((store) => (
                    <li
                      key={String(store.id)}
                      className="border-border/60 border-b border-dashed pb-1 text-[11px] last:border-0"
                    >
                      <p className="font-medium leading-snug">{store.name}</p>
                      {store.address ? (
                        <p className="text-muted-foreground leading-snug">
                          {store.address}
                        </p>
                      ) : (
                        <p className="text-muted-foreground italic">
                          No address on record
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium">Monthly turnover trend</p>
        <SimulationTrendChart timeline={zone.captureTimeline} />
        <ul className="text-muted-foreground mt-2 space-y-0.5 text-[10px]">
          {detailSim.milestones.map((m) => (
            <li
              key={m.label}
              className="flex justify-between gap-2 border-b border-dashed py-0.5 last:border-0"
            >
              <span>{m.label}</span>
              <span>
                {formatZarShort(m.lowMonthlyZAR)} –{' '}
                {formatZarShort(m.highMonthlyZAR)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <ZoneExplainAiButton
        payload={{
          kind: zone.kind === 'catchment' ? 'catchment' : 'greenfield',
          title:
            zone.kind === 'catchment' ? zone.branchName : zone.label,
          rank: zone.rank,
          radiusKm: zone.radiusMeters / 1000,
          competitorCount: zone.competitorCount,
          clientCount: zone.clientCount,
          addressablePoolZAR: zone.addressablePoolZAR,
          potentialLowZAR: zone.potentialLowZAR,
          potentialHighZAR: zone.potentialHighZAR,
          simulatedMonthlyZAR: detailSim.simulatedMonthlyZAR,
          actualMonthlyZAR: detailSim.actualMonthlyZAR ?? null,
          actualMonthLabel: monthLabel,
          competitionLabel: matureShareByCompetition(zone.competitorCount)
            .label,
          competitorNames: [...competitorsByBrand.values()]
            .flat()
            .map((s) => s.name)
            .slice(0, 12),
          monthsToMature: zone.monthsToTargetMid ?? null,
        }}
      />
    </div>
  );
}

function ZoneAccordionRow({
  zone,
  selected,
  onOpenChange,
  detailContent,
}: {
  zone: SiteOpportunityZone;
  selected: boolean;
  onOpenChange: (open: boolean) => void;
  detailContent: ReactNode;
}) {
  const sim = buildTurnoverSimulation(zone, {
    actualRevenueZAR: zone.kind === 'catchment' ? zone.actualRevenueZAR : null,
    actualRevenueMonthLabel: currentMonthLabel(),
  });
  const title = zone.kind === 'catchment' ? zone.branchName : zone.label;
  const intensity = matureShareByCompetition(zone.competitorCount);

  return (
    <Collapsible
      open={selected}
      onOpenChange={onOpenChange}
      className={cn(
        'rounded-md border transition-colors',
        selected
          ? 'border-teal-700/40 bg-teal-50/80 dark:bg-teal-950/30'
          : 'border-border hover:bg-muted/40',
      )}
    >
      <CollapsibleTrigger asChild>
        <button type="button" className="w-full px-2.5 py-2 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`truncate text-xs ${branchSimulationTextClass(sim)}`}>
                #{zone.rank} {title}
              </p>
              <p className="text-muted-foreground mt-0.5 text-[10px] leading-snug">
                {zone.competitorCount} hardwares · pool{' '}
                {formatZarShort(zone.addressablePoolZAR)}/mo · {intensity.label}
              </p>
            </div>
            <div className="flex shrink-0 items-start gap-1">
              <div className="text-right text-[10px]">
                <p className="font-medium">
                  {formatZarShort(sim.simulatedMonthlyZAR)}
                </p>
                <p className="text-muted-foreground">
                  {sim.actualMonthlyZAR != null
                    ? `ERP ${formatZarShort(sim.actualMonthlyZAR)}`
                    : 'Simulated'}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'text-muted-foreground mt-0.5 size-3.5 shrink-0 transition-transform',
                  selected && 'rotate-180',
                )}
              />
            </div>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>{selected ? detailContent : null}</CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Docked simulation panel: configure defaults, run, and review results beside the map.
 * ~20% width so the map gains ~10pp vs the previous 30% panel.
 */
export function SimulationSidePanel() {
  const {
    panelOpen,
    panelMode,
    setPanelMode,
    closePanel,
    result,
    isActive,
    selectedZoneId,
    selectZone,
    setSimulationResult,
    clearSimulation,
    erpMatchedStores,
    erpError,
    selectedZone,
    runMarkers,
  } = useVisualiserSimulation();

  const [isRunning, setIsRunning] = useState(false);
  const [settings, setSettings] = useState<SiteOpportunitySettings>(
    DEFAULT_SITE_OPPORTUNITY_SETTINGS,
  );
  const [brandTurnovers, setBrandTurnovers] = useState(() =>
    seedBrandTurnovers(),
  );
  const [mode, setMode] = useState<'both' | 'catchment' | 'greenfield'>('both');

  const branchesQuery = useBranches({ enabled: panelOpen });
  const competitorsQuery = useCompetitorsMapData({ enabled: panelOpen });
  const clientsQuery = useClientsMapData({ enabled: panelOpen });
  const storesSalesQuery = useStoresSales(undefined, { enabled: panelOpen });

  useEffect(() => {
    if (!panelOpen) return;
    const prefs = loadVisualiserPreferences();
    setSettings({
      ...DEFAULT_SITE_OPPORTUNITY_SETTINGS,
      ...prefs.opportunitySettings,
    });
    setBrandTurnovers(seedBrandTurnovers(prefs.turnoverOverrides));
    setMode(prefs.opportunityMode);
  }, [panelOpen]);

  const monthRange = monthlyDateRange();
  const monthLabel = currentMonthLabel();

  const detailSim = useMemo(() => {
    if (!selectedZone) return null;
    return buildTurnoverSimulation(selectedZone, {
      actualRevenueZAR:
        selectedZone.kind === 'catchment'
          ? selectedZone.actualRevenueZAR
          : null,
      actualRevenueMonthLabel: monthLabel,
      repTargetMonthlyZAR: settings.repTargetMonthlyZAR,
    });
  }, [selectedZone, settings.repTargetMonthlyZAR, monthLabel]);

  const competitorsInZone = useMemo(() => {
    if (!selectedZone || runMarkers.length === 0) return [];
    return listCompetitorsInZone(
      { lat: selectedZone.lat, lng: selectedZone.lng },
      selectedZone.radiusMeters,
      runMarkers,
    );
  }, [selectedZone, runMarkers]);

  const competitorsByBrand = useMemo(() => {
    const map = new Map<HardwareBrandKey, typeof competitorsInZone>();
    for (const store of competitorsInZone) {
      const list = map.get(store.brand) ?? [];
      list.push(store);
      map.set(store.brand, list);
    }
    return map;
  }, [competitorsInZone]);

  function resetDefaults() {
    setSettings({ ...DEFAULT_SITE_OPPORTUNITY_SETTINGS });
    setBrandTurnovers(seedBrandTurnovers());
    setMode('both');
    saveVisualiserPreferences({
      opportunitySettings: DEFAULT_SITE_OPPORTUNITY_SETTINGS,
      opportunityMode: 'both',
      turnoverOverrides: { brandTurnoverOverrides: {} },
    });
    toast.success('Defaults restored');
  }

  async function handleRunSimulation() {
    if (isRunning) return;
    setIsRunning(true);
    toast.loading('Building opportunity markers…', { id: 'map-simulate' });

    try {
      const branches = branchesQuery.data ?? [];
      const competitors = competitorsQuery.data ?? [];
      const clients = clientsQuery.data ?? [];

      if (branches.length === 0 && competitors.length === 0) {
        toast.error('Need geocoded branches or competitors on the map first.', {
          id: 'map-simulate',
        });
        return;
      }

      const turnoverOverrides: TurnoverOverrideSettings = {
        brandTurnoverOverrides: Object.fromEntries(
          EDITABLE_BRANDS.map((brand) => [brand, brandTurnovers[brand]]),
        ) as Partial<Record<HardwareBrandKey, number>>,
      };

      saveVisualiserPreferences({
        opportunitySettings: settings,
        opportunityMode: mode,
        turnoverOverrides,
      });

      toast.loading('Counting hardwares in catchments…', { id: 'map-simulate' });
      await new Promise((r) => setTimeout(r, 40));

      const markers = buildOpportunityMarkers({
        branches,
        competitors,
        clients,
      });

      let computed = computeSiteOpportunities(markers, {
        mode,
        settings,
        onProgress: (message) => {
          toast.loading(message, { id: 'map-simulate' });
        },
      });

      computed = {
        ...computed,
        catchments: computed.catchments.map((z) =>
          applyTurnoverOverridesToZone(
            z,
            settings.captureLowPct,
            settings.captureHighPct,
            turnoverOverrides,
          ),
        ),
        greenfield: computed.greenfield.map((z) =>
          applyTurnoverOverridesToZone(
            z,
            settings.captureLowPct,
            settings.captureHighPct,
            turnoverOverrides,
          ),
        ),
      };

      let matched = 0;
      let erpErr: string | null = null;

      toast.loading(`Matching ERP store sales (${monthLabel})…`, {
        id: 'map-simulate',
      });

      let dashboard = storesSalesQuery.data;
      if (!dashboard && !storesSalesQuery.isError) {
        const refreshed = await storesSalesQuery.refetch();
        dashboard = refreshed.data;
      }

      if (dashboard?.salesPerStore?.length) {
        const enriched = enrichCatchmentsWithDashboardRevenue(
          computed.catchments,
          branches,
          {
            salesPerStore: dashboard.salesPerStore,
            masterData: dashboard.masterData,
          },
          {
            startDate: dashboard.startDate ?? monthRange.startDate,
            endDate: dashboard.endDate ?? monthRange.endDate,
          },
        );
        matched = enriched.filter(
          (c) => c.actualRevenueZAR != null && c.actualRevenueZAR > 0,
        ).length;
        computed = { ...computed, catchments: enriched };
        if (matched === 0) {
          erpErr =
            'ERP sales loaded but no branches matched store codes/names — modelled potential only.';
        }
      } else if (storesSalesQuery.isError) {
        erpErr =
          'ERP store sales unavailable — showing modelled potential only.';
      } else if (dashboard && !dashboard.success) {
        erpErr =
          dashboard.errors?.[0]?.message ??
          'ERP store sales returned no rows — modelled potential only.';
      } else {
        erpErr =
          'ERP store sales returned no rows for this month — modelled potential only.';
      }

      setSimulationResult(computed, {
        erpMatchedStores: matched,
        erpError: erpErr,
        markers,
      });

      toast.success(
        `Simulation ready: ${computed.catchments.length} catchments, ${computed.greenfield.length} opportunities${matched ? ` · ${matched} with ERP (${monthLabel})` : ''}.`,
        { id: 'map-simulate', duration: 5000 },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Simulation failed';
      toast.error(message, { id: 'map-simulate' });
    } finally {
      setIsRunning(false);
    }
  }

  if (!panelOpen) return null;

  const captureLowPctDisplay = Math.round(settings.captureLowPct * 100);
  const captureHighPctDisplay = Math.round(settings.captureHighPct * 100);

  function renderZoneDetail(zone: SiteOpportunityZone) {
    if (!detailSim || selectedZoneId !== zone.id) return null;
    return (
      <ZoneDetailBody
        zone={zone}
        detailSim={detailSim}
        captureLowPctDisplay={captureLowPctDisplay}
        captureHighPctDisplay={captureHighPctDisplay}
        competitorsByBrand={competitorsByBrand}
      />
    );
  }

  return (
    <aside className="border-border bg-background flex h-full w-[20%] min-w-[16rem] max-w-[22rem] shrink-0 flex-col overflow-hidden border-l">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Store turnover simulation</h2>
          <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
            {(settings.radiusMeters / 1000).toFixed(0)} km pool × brand turnovers →{' '}
            {captureLowPctDisplay}% / {captureHighPctDisplay}% potential
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={closePanel}
          aria-label="Close simulation panel"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex shrink-0 gap-1 border-b px-2 py-1.5">
        <Button
          type="button"
          size="sm"
          className={cn(
            'h-7 flex-1 text-xs',
            panelMode === 'configure'
              ? 'bg-red-600 text-white hover:bg-red-600/90'
              : 'bg-red-600/15 text-red-700 hover:bg-red-600/25 dark:text-red-300',
          )}
          onClick={() => setPanelMode('configure')}
        >
          <Settings2 className="size-3.5" />
          Settings
        </Button>
        <Button
          type="button"
          size="sm"
          className={cn(
            'h-7 flex-1 text-xs',
            isActive
              ? panelMode === 'results'
                ? 'bg-green-600 text-white hover:bg-green-600/90'
                : 'bg-green-600/20 text-green-800 hover:bg-green-600/30 dark:text-green-300'
              : 'bg-muted text-muted-foreground',
          )}
          disabled={!isActive}
          onClick={() => setPanelMode('results')}
        >
          {isActive ? (
            <Check className="size-3.5" />
          ) : (
            <Store className="size-3.5" />
          )}
          Results
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {panelMode === 'configure' ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Use defaults or adjust values, then start. Map stays visible beside
              this panel.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="sim-radius" className="text-[11px]">
                  Radius (km)
                </Label>
                <Input
                  id="sim-radius"
                  type="number"
                  min={1}
                  max={20}
                  step={0.5}
                  value={settings.radiusMeters / 1000}
                  onChange={(e) => {
                    const km = Number(e.target.value);
                    if (!Number.isFinite(km)) return;
                    setSettings((s) => ({
                      ...s,
                      radiusMeters: Math.round(km * 1000),
                    }));
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sim-sep" className="text-[11px]">
                  Dist to Branch
                </Label>
                <Input
                  id="sim-sep"
                  type="number"
                  min={5}
                  max={50}
                  step={1}
                  value={settings.minBranchSeparationKm}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    setSettings((s) => ({ ...s, minBranchSeparationKm: v }));
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sim-cap-low" className="text-[11px]">
                  Capture low %
                </Label>
                <Input
                  id="sim-cap-low"
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={captureLowPctDisplay}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    setSettings((s) => ({
                      ...s,
                      captureLowPct: Math.min(1, Math.max(0.01, v / 100)),
                    }));
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sim-cap-high" className="text-[11px]">
                  Capture high %
                </Label>
                <Input
                  id="sim-cap-high"
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={captureHighPctDisplay}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    setSettings((s) => ({
                      ...s,
                      captureHighPct: Math.min(1, Math.max(0.01, v / 100)),
                    }));
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sim-topn" className="text-[11px]">
                  Top N opportunities
                </Label>
                <Input
                  id="sim-topn"
                  type="number"
                  min={3}
                  max={30}
                  step={1}
                  value={settings.topN}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    setSettings((s) => ({ ...s, topN: Math.round(v) }));
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium">Brand turnover (R / month)</p>
              <div className="space-y-1.5">
                {EDITABLE_BRANDS.map((brand) => (
                  <div
                    key={brand}
                    className="flex items-center justify-between gap-2"
                  >
                    <Label
                      htmlFor={`brand-${brand}`}
                      className="text-muted-foreground w-24 shrink-0 text-[11px]"
                    >
                      {brand}
                    </Label>
                    <Input
                      id={`brand-${brand}`}
                      type="number"
                      min={100_000}
                      step={100_000}
                      value={brandTurnovers[brand]}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v) || v <= 0) return;
                        setBrandTurnovers((prev) => ({ ...prev, [brand]: v }));
                      }}
                      className="h-7 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={resetDefaults}
            >
              <RotateCcw className="size-3.5" />
              Reset defaults
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            {result?.warnings?.length ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-50/50 px-2.5 py-2 text-[11px] text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
                <div className="mb-1 flex items-center gap-1 font-medium">
                  <AlertTriangle className="size-3" />
                  Data quality
                </div>
                <ul className="list-disc space-y-0.5 pl-3.5">
                  {result.warnings.slice(0, 3).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {erpError ? (
              <p className="text-muted-foreground text-[11px]">{erpError}</p>
            ) : null}

            {result ? (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-1 text-xs font-semibold">
                      <Store className="size-3.5" />
                      Catchments ({result.catchments.length})
                    </h3>
                    {erpMatchedStores > 0 ? (
                      <span className="text-muted-foreground text-[10px]">
                        {erpMatchedStores} ERP · {monthLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    {result.catchments.map((z) => (
                      <ZoneAccordionRow
                        key={z.id}
                        zone={z}
                        selected={selectedZoneId === z.id}
                        onOpenChange={(open) =>
                          selectZone(open ? z.id : null)
                        }
                        detailContent={renderZoneDetail(z)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="flex items-center gap-1 text-xs font-semibold">
                    <MapPin className="size-3.5" />
                    Opportunities ({result.greenfield.length})
                  </h3>
                  <div className="space-y-1">
                    {result.greenfield.map((z) => (
                      <ZoneAccordionRow
                        key={z.id}
                        zone={z}
                        selected={selectedZoneId === z.id}
                        onOpenChange={(open) =>
                          selectZone(open ? z.id : null)
                        }
                        detailContent={renderZoneDetail(z)}
                      />
                    ))}
                  </div>
                </div>

                {!selectedZoneId ? (
                  <p className="text-muted-foreground text-xs">
                    Expand a catchment or opportunity row for detail.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground text-xs">
                Run a simulation from Settings to see results here.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t px-3 py-2.5">
        {isActive ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              clearSimulation();
              toast.success('Simulation overlay cleared');
            }}
          >
            <X className="size-3.5" />
            Clear overlay
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          onClick={() => void handleRunSimulation()}
          disabled={
            isRunning ||
            branchesQuery.isLoading ||
            competitorsQuery.isLoading
          }
        >
          {isRunning ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {isRunning
            ? 'Running…'
            : isActive
              ? 'Re-run simulation'
              : 'Start simulation'}
        </Button>
      </div>
    </aside>
  );
}
