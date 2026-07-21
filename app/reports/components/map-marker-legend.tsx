'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import type { MapMarkerBase } from '@/api/types/map';
import {
  MARKER_COLORS,
  MARKER_TYPE_LABELS,
} from '@/app/reports/components/map-report-constants';
import { zAboveLeafletFullscreen } from '@/lib/z-index';
import { cn } from '@/lib/utils';

export interface MapOverlayToggles {
  showInfluenceCircles: boolean;
  showSuggestedAreas: boolean;
  showSalesRepLocations: boolean;
  showClients: boolean;
  showCompetitors: boolean;
  showBranches: boolean;
  showOrg: boolean;
}

export const DEFAULT_OVERLAY_TOGGLES: MapOverlayToggles = {
  showInfluenceCircles: false,
  showSuggestedAreas: false,
  showSalesRepLocations: false,
  showClients: true,
  showCompetitors: true,
  showBranches: true,
  showOrg: true,
};

export interface MapMarkerLegendProps {
  markers: MapMarkerBase[];
  overlays: MapOverlayToggles;
  onOverlayChange: (patch: Partial<MapOverlayToggles>) => void;
  onSuggestedAreas?: () => void;
  className?: string;
}

export function MapMarkerLegend({
  markers,
  overlays,
  onOverlayChange,
  onSuggestedAreas,
  className,
}: MapMarkerLegendProps) {
  const [expanded, setExpanded] = useState(true);

  const presentTypes = useMemo(() => {
    const types = new Set<string>();
    for (const m of markers) {
      const mt = String(m.markerType ?? '');
      if (mt) types.add(mt);
    }
    return Array.from(types).sort();
  }, [markers]);

  return (
    <div
      className={cn(
        zAboveLeafletFullscreen,
        'absolute bottom-2 right-2 max-w-[200px] rounded-md border border-border bg-background/95 text-xs shadow-md backdrop-blur-sm',
        className
      )}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 font-medium hover:bg-muted/60"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="inline-flex items-center gap-1.5">
          <Layers className="size-3.5" />
          Layers
        </span>
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronUp className="size-3.5 shrink-0" />
        )}
      </button>
      {expanded ? (
        <div className="space-y-2 border-t border-border px-3 py-2">
          <fieldset className="space-y-1">
            <legend className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Overlays
            </legend>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={overlays.showInfluenceCircles}
                onChange={(e) =>
                  onOverlayChange({ showInfluenceCircles: e.target.checked })
                }
                className="size-3.5 rounded border-border"
              />
              Influence circles
            </label>
            {onSuggestedAreas ? (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={overlays.showSuggestedAreas}
                  onChange={() => onSuggestedAreas()}
                  className="size-3.5 rounded border-border"
                />
                Suggested areas
              </label>
            ) : null}
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={overlays.showSalesRepLocations}
                onChange={(e) =>
                  onOverlayChange({ showSalesRepLocations: e.target.checked })
                }
                className="size-3.5 rounded border-border"
              />
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: MARKER_COLORS.salesRep }}
              />
              Sales rep locations
            </label>
          </fieldset>
          {presentTypes.length > 0 ? (
            <fieldset className="space-y-1">
              <legend className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Marker types
              </legend>
              {presentTypes.includes('client') ? (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overlays.showClients}
                    onChange={(e) =>
                      onOverlayChange({ showClients: e.target.checked })
                    }
                    className="size-3.5 rounded border-border"
                  />
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: MARKER_COLORS.client }}
                  />
                  {MARKER_TYPE_LABELS.client}
                </label>
              ) : null}
              {presentTypes.includes('competitor') ? (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overlays.showCompetitors}
                    onChange={(e) =>
                      onOverlayChange({ showCompetitors: e.target.checked })
                    }
                    className="size-3.5 rounded border-border"
                  />
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: MARKER_COLORS.competitor }}
                  />
                  {MARKER_TYPE_LABELS.competitor}
                </label>
              ) : null}
              {presentTypes.includes('branch') ? (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overlays.showBranches}
                    onChange={(e) =>
                      onOverlayChange({ showBranches: e.target.checked })
                    }
                    className="size-3.5 rounded border-border"
                  />
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: MARKER_COLORS.branch }}
                  />
                  {MARKER_TYPE_LABELS.branch}
                </label>
              ) : null}
              {presentTypes.includes('org') ? (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overlays.showOrg}
                    onChange={(e) =>
                      onOverlayChange({ showOrg: e.target.checked })
                    }
                    className="size-3.5 rounded border-border"
                  />
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: MARKER_COLORS.org }}
                  />
                  {MARKER_TYPE_LABELS.org}
                </label>
              ) : null}
              {presentTypes
                .filter((t) => !['client', 'competitor', 'branch', 'org'].includes(t))
                .map((t) => (
                  <div key={t} className="flex items-center gap-2 pl-5 text-muted-foreground">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: MARKER_COLORS[t] ?? '#64748b' }}
                    />
                    {MARKER_TYPE_LABELS[t] ?? t}
                  </div>
                ))}
            </fieldset>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
