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
  SiteOpportunityMode,
  SiteOpportunitySettings,
  SiteOpportunityZone,
} from '@/api/types/site-opportunity';

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
              className={cn('w-72', reportsFilterPortalHighZ)}
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
