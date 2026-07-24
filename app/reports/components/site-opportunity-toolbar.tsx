'use client';

import { MapPin, SlidersHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { reportsFilterPortalHighZ } from '@/app/reports/components/reports-searchable-filter-comboboxes';
import { SiteOpportunityTableDialog } from '@/app/reports/components/site-opportunity-table-dialog';
import type {
  BranchCatchmentOpportunity,
  DataQualitySummary,
  GreenfieldOpportunityZone,
  HardwareBrandKey,
  SiteOpportunityMode,
  SiteOpportunitySettings,
  SiteOpportunityZone,
  TurnoverOverrideSettings,
} from '@/api/types/site-opportunity';
import {
  CATEGORY_LABELS,
  RETAILER_BRANDS,
  SD_BRANDS,
} from '@/lib/site-opportunity/compute/competitor-category';
import { HARDWARE_TURNOVER_ZAR } from '@/lib/site-opportunity/compute/brands';

const ALL_BRAND_KEYS = Object.keys(HARDWARE_TURNOVER_ZAR) as HardwareBrandKey[];

const MODE_OPTIONS = [
  ['greenfield', 'New sites'],
  ['catchment', 'Branch catchments'],
  ['both', 'Both'],
] as const satisfies ReadonlyArray<readonly [SiteOpportunityMode, string]>;

export function SiteOpportunityToolbar({
  showOpportunities,
  onToggleShow,
  mode,
  onModeChange,
  settings,
  onSettingsChange,
  turnoverOverrides,
  onTurnoverOverridesChange,
  className,
  isLoading = false,
  isError = false,
  errorMessage,
  warnings = [],
  dataQuality,
  catchments = [],
  greenfield = [],
  onSelectZone,
  suggestedAreasDisabled = false,
  suggestedAreasDisabledReason,
  insufficientGeoWarning,
}: {
  showOpportunities: boolean;
  onToggleShow: () => void;
  mode: SiteOpportunityMode;
  onModeChange: (mode: SiteOpportunityMode) => void;
  settings: SiteOpportunitySettings;
  onSettingsChange: (patch: Partial<SiteOpportunitySettings>) => void;
  turnoverOverrides?: TurnoverOverrideSettings;
  onTurnoverOverridesChange?: (next: TurnoverOverrideSettings) => void;
  className?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  warnings?: string[];
  dataQuality?: DataQualitySummary;
  catchments?: BranchCatchmentOpportunity[];
  greenfield?: GreenfieldOpportunityZone[];
  onSelectZone?: (zone: SiteOpportunityZone) => void;
  /** When true, Suggested areas cannot be turned on (e.g. no country selected). */
  suggestedAreasDisabled?: boolean;
  suggestedAreasDisabledReason?: string;
  /** Soft warning when filtered area lacks enough geolocated competitors for clusters. */
  insufficientGeoWarning?: string | null;
}) {
  const showDataBanner =
    showOpportunities &&
    dataQuality != null &&
    dataQuality.competitorCoveragePct < 95;
  const showInsufficientGeo =
    showOpportunities &&
    !isLoading &&
    Boolean(insufficientGeoWarning);
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 py-2 px-1 border-b border-border/60',
        className
      )}
    >
      <Button
        type="button"
        size="sm"
        variant={showOpportunities ? 'default' : 'outline'}
        onClick={onToggleShow}
        disabled={
          (isLoading && showOpportunities) ||
          (suggestedAreasDisabled && !showOpportunities)
        }
        title={
          suggestedAreasDisabled && !showOpportunities
            ? suggestedAreasDisabledReason
            : undefined
        }
      >
        {isLoading && showOpportunities ? (
          <Loader2 className="size-4 mr-1.5 animate-spin" />
        ) : (
          <MapPin className="size-4 mr-1.5" />
        )}
        Suggested areas
      </Button>

      {showInsufficientGeo ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 max-w-md">
          {insufficientGeoWarning}
        </p>
      ) : showDataBanner ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 max-w-md">
          {warnings[0] ??
            `Hardware map coverage is ${dataQuality!.competitorCoveragePct}%. Geocode competitors for accurate pool totals.`}
        </p>
      ) : null}

      {showOpportunities ? (
        <>
          {MODE_OPTIONS.map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={mode === value ? 'default' : 'outline'}
              onClick={() => onModeChange(value)}
            >
              {label}
            </Button>
          ))}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="Opportunity settings"
              >
                <SlidersHorizontal className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className={cn('w-80 max-h-[80vh] overflow-y-auto', reportsFilterPortalHighZ)}
              align="end"
              side="bottom"
            >
              <div className="space-y-3">
                <div>
                  <Label htmlFor="opp-radius">Radius (km)</Label>
                  <Input
                    id="opp-radius"
                    type="number"
                    min={1}
                    max={20}
                    value={settings.radiusMeters / 1000}
                    onChange={(e) =>
                      onSettingsChange({
                        radiusMeters: Number(e.target.value) * 1000,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="opp-top">Top zones</Label>
                  <Input
                    id="opp-top"
                    type="number"
                    min={3}
                    max={30}
                    value={settings.topN}
                    onChange={(e) =>
                      onSettingsChange({ topN: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="opp-sep">Min branch separation (km)</Label>
                  <Input
                    id="opp-sep"
                    type="number"
                    min={5}
                    max={50}
                    value={settings.minBranchSeparationKm}
                    onChange={(e) =>
                      onSettingsChange({
                        minBranchSeparationKm: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="opp-capture-low">Low capture %</Label>
                  <Input
                    id="opp-capture-low"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={Math.round(settings.captureLowPct * 100)}
                    onChange={(e) =>
                      onSettingsChange({
                        captureLowPct: Number(e.target.value) / 100,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="opp-capture-high">High capture %</Label>
                  <Input
                    id="opp-capture-high"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={Math.round(settings.captureHighPct * 100)}
                    onChange={(e) =>
                      onSettingsChange({
                        captureHighPct: Number(e.target.value) / 100,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="opp-rep-target">Rep monthly target (ZAR)</Label>
                  <Input
                    id="opp-rep-target"
                    type="number"
                    min={100000}
                    step={100000}
                    value={settings.repTargetMonthlyZAR}
                    onChange={(e) =>
                      onSettingsChange({
                        repTargetMonthlyZAR: Number(e.target.value),
                      })
                    }
                  />
                </div>
                {onTurnoverOverridesChange ? (
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-semibold text-foreground">
                      Competitor turnover overrides (monthly)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="opp-retailer-turnover" className="text-xs">
                          {CATEGORY_LABELS.retailer} (all)
                        </Label>
                        <Input
                          id="opp-retailer-turnover"
                          type="number"
                          min={0}
                          step={100000}
                          placeholder="Default per brand"
                          value={
                            turnoverOverrides?.categoryTurnoverOverrides?.retailer ?? ''
                          }
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            const next = { ...(turnoverOverrides ?? {}) };
                            next.categoryTurnoverOverrides = {
                              ...next.categoryTurnoverOverrides,
                            };
                            if (!raw) {
                              delete next.categoryTurnoverOverrides.retailer;
                            } else {
                              next.categoryTurnoverOverrides.retailer = Number(raw);
                            }
                            onTurnoverOverridesChange(next);
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="opp-sd-turnover" className="text-xs">
                          {CATEGORY_LABELS.sd} (all)
                        </Label>
                        <Input
                          id="opp-sd-turnover"
                          type="number"
                          min={0}
                          step={100000}
                          placeholder="Default per brand"
                          value={
                            turnoverOverrides?.categoryTurnoverOverrides?.sd ?? ''
                          }
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            const next = { ...(turnoverOverrides ?? {}) };
                            next.categoryTurnoverOverrides = {
                              ...next.categoryTurnoverOverrides,
                            };
                            if (!raw) {
                              delete next.categoryTurnoverOverrides.sd;
                            } else {
                              next.categoryTurnoverOverrides.sd = Number(raw);
                            }
                            onTurnoverOverridesChange(next);
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {ALL_BRAND_KEYS.map((brand) => (
                        <div key={brand} className="flex items-center gap-2">
                          <Label
                            htmlFor={`opp-brand-${brand}`}
                            className="text-[11px] shrink-0 w-[88px] truncate"
                            title={brand}
                          >
                            {brand}
                          </Label>
                          <Input
                            id={`opp-brand-${brand}`}
                            type="number"
                            min={0}
                            step={100000}
                            className="h-8 text-xs"
                            placeholder={String(HARDWARE_TURNOVER_ZAR[brand])}
                            value={
                              turnoverOverrides?.brandTurnoverOverrides?.[brand] ?? ''
                            }
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              const next = { ...(turnoverOverrides ?? {}) };
                              next.brandTurnoverOverrides = {
                                ...next.brandTurnoverOverrides,
                              };
                              if (!raw) {
                                delete next.brandTurnoverOverrides[brand];
                              } else {
                                next.brandTurnoverOverrides[brand] = Number(raw);
                              }
                              onTurnoverOverridesChange(next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Retailers: {RETAILER_BRANDS.join(', ')} · SD: {SD_BRANDS.join(', ')}
                    </p>
                  </div>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>

          {onSelectZone ? (
            <SiteOpportunityTableDialog
              catchments={catchments}
              greenfield={greenfield}
              isLoading={isLoading}
              isError={isError}
              errorMessage={errorMessage}
              onSelectZone={onSelectZone}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
