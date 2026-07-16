'use client';

import { Fragment, useCallback, useEffect, useRef } from 'react';
import { Circle, Marker, Popup, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type L from 'leaflet';
import type { BranchListItem } from '@/api/types/branch';
import type { MapMarkerBase } from '@/api/types/map';
import type {
  BranchCatchmentOpportunity,
  GreenfieldOpportunityZone,
  SiteOpportunityZone,
} from '@/api/types/site-opportunity';
import { ActualVsSimulatedTurnover } from '@/app/reports/components/actual-vs-simulated-turnover';
import { BranchCatchmentLogo } from '@/app/reports/components/branch-catchment-logo';
import {
  formatZarShort,
  getPotentialBreakdown,
} from '@/lib/site-opportunity/format-potential';
import { buildTurnoverSimulation } from '@/lib/site-opportunity/turnover-simulation';
import { resolveBranchLogoUrl } from '@/lib/utils/resolve-branch-logo-url';

const FLY_DURATION_S = 0.6;
const POPUP_OPEN_DELAY_MS = 650;

function brandSummary(byBrand: SiteOpportunityZone['byBrand'] | undefined): string {
  if (!byBrand?.length) return 'No hardware in radius';
  return byBrand
    .slice(0, 4)
    .map((b) => `${b.brand} ×${b.count}`)
    .join(' · ');
}

function scoreColor(score: number, maxScore: number): string {
  if (maxScore <= 0) return '#22c55e';
  const t = Math.min(1, score / maxScore);
  const r = Math.round(234 - t * 120);
  const g = Math.round(179 + t * 60);
  const b = Math.round(8 + t * 40);
  return `rgb(${r},${g},${b})`;
}

function rankedLabelIcon(rank: number, color: string) {
  return divIcon({
    className: 'site-opp-rank-marker',
    html: `<div style="
      width:28px;height:28px;border-radius:9999px;
      background:${color};color:#fff;font-weight:700;font-size:12px;
      font-family:var(--font-urbanist, Urbanist),ui-sans-serif,system-ui,sans-serif;
      display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25);
    ">${rank}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function PotentialBreakdown({
  potentialLowZAR,
  potentialHighZAR,
}: {
  potentialLowZAR: number;
  potentialHighZAR: number;
}) {
  const { low, avg, high } = getPotentialBreakdown(
    potentialLowZAR,
    potentialHighZAR,
  );

  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-neutral-700">Potential (monthly)</p>
      <p className="font-medium text-neutral-900">Low: {formatZarShort(low)}/mo</p>
      <p className="font-medium text-neutral-900">Avg: {formatZarShort(avg)}/mo</p>
      <p className="font-medium text-neutral-900">High: {formatZarShort(high)}/mo</p>
    </div>
  );
}

function CatchmentPopupContent({
  catchment,
  branchMarkers,
  branches,
  orgLogoUrl,
}: {
  catchment: BranchCatchmentOpportunity;
  branchMarkers: MapMarkerBase[];
  branches: BranchListItem[];
  orgLogoUrl?: string | null;
}) {
  const logoUrl = resolveBranchLogoUrl(catchment.branchId, {
    branchMarkers,
    branches,
    orgLogoUrl,
  });
  const simulation = buildTurnoverSimulation(catchment, {
    actualRevenueZAR: catchment.actualRevenueZAR,
  });

  return (
    <div className="min-w-[180px] space-y-2 text-sm text-neutral-900">
      <div className="flex items-center gap-2">
        <BranchCatchmentLogo branchName={catchment.branchName} logoUrl={logoUrl} />
        <p className="font-semibold leading-snug text-neutral-900">
          #{catchment.rank} {catchment.branchName}
        </p>
      </div>
      <p className="font-medium text-neutral-900">
        Pool: {formatZarShort(catchment.addressablePoolZAR)}/mo
      </p>
      <PotentialBreakdown
        potentialLowZAR={catchment.potentialLowZAR}
        potentialHighZAR={catchment.potentialHighZAR}
      />
      <ActualVsSimulatedTurnover simulation={simulation} compact />
      <p className="font-medium text-neutral-900">
        {catchment.competitorCount} competitors · {catchment.clientCount} clients
      </p>
      <p className="text-xs text-neutral-700">{brandSummary(catchment.byBrand)}</p>
    </div>
  );
}

function openLayerPopup(layer: L.Layer | undefined): void {
  if (!layer || !('openPopup' in layer)) return;
  const openPopup = layer.openPopup;
  if (typeof openPopup === 'function') {
    openPopup.call(layer);
  }
}

function OpportunityZoneNavigator({
  catchments,
  greenfield,
  selectedZoneId,
  selectionSeq,
  layerRefs,
}: {
  catchments: BranchCatchmentOpportunity[];
  greenfield: GreenfieldOpportunityZone[];
  selectedZoneId: string | null;
  selectionSeq: number;
  layerRefs: React.MutableRefObject<Map<string, L.Layer>>;
}) {
  const map = useMap();
  const flyTokenRef = useRef(0);

  useEffect(() => {
    if (!selectedZoneId || selectionSeq === 0) return;

    const zone =
      catchments.find((c) => c.id === selectedZoneId) ??
      greenfield.find((g) => g.id === selectedZoneId);
    if (!zone) return;

    const token = ++flyTokenRef.current;
    map.flyTo([zone.lat, zone.lng], Math.max(map.getZoom(), 14), {
      duration: FLY_DURATION_S,
    });

    const timer = window.setTimeout(() => {
      if (token !== flyTokenRef.current) return;
      openLayerPopup(layerRefs.current.get(selectedZoneId));
    }, POPUP_OPEN_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    catchments,
    greenfield,
    layerRefs,
    map,
    selectedZoneId,
    selectionSeq,
  ]);

  return null;
}

export function SiteOpportunityMapOverlays({
  catchments,
  greenfield,
  selectedZoneId,
  selectionSeq = 0,
  onSelectZone,
  branchMarkers = [],
  branches = [],
  orgLogoUrl,
}: {
  catchments: BranchCatchmentOpportunity[];
  greenfield: GreenfieldOpportunityZone[];
  selectedZoneId: string | null;
  /** Increments on each selection so re-clicking the same zone re-flies. */
  selectionSeq?: number;
  onSelectZone: (zone: SiteOpportunityZone) => void;
  branchMarkers?: MapMarkerBase[];
  branches?: BranchListItem[];
  orgLogoUrl?: string | null;
}) {
  const layerRefs = useRef<Map<string, L.Layer>>(new Map());

  const registerLayerRef = useCallback(
    (zoneId: string) => (instance: L.Layer | null) => {
      if (instance) {
        layerRefs.current.set(zoneId, instance);
        return;
      }
      layerRefs.current.delete(zoneId);
    },
    []
  );

  const maxScore = Math.max(
    ...catchments.map((c) => c.opportunityScore),
    ...greenfield.map((g) => g.opportunityScore),
    1
  );

  return (
    <>
      <OpportunityZoneNavigator
        catchments={catchments}
        greenfield={greenfield}
        selectedZoneId={selectedZoneId}
        selectionSeq={selectionSeq}
        layerRefs={layerRefs}
      />
      {catchments.map((c) => {
        const color = scoreColor(c.opportunityScore, maxScore);
        const selected = selectedZoneId === c.id;
        return (
          <Circle
            key={c.id}
            ref={registerLayerRef(c.id)}
            center={[c.lat, c.lng]}
            radius={c.radiusMeters}
            pathOptions={{
              color: selected ? '#854d0e' : color,
              weight: selected ? 3 : 2,
              dashArray: '8 6',
              fillColor: color,
              fillOpacity: selected ? 0.22 : 0.12,
            }}
            eventHandlers={{
              click: () => onSelectZone(c),
            }}
          >
            <Popup className="reports-viz-popup" autoPanPadding={[24, 24]} maxWidth={320}>
              <CatchmentPopupContent
                catchment={c}
                branchMarkers={branchMarkers}
                branches={branches}
                orgLogoUrl={orgLogoUrl}
              />
            </Popup>
          </Circle>
        );
      })}
      {greenfield.map((g) => {
        const color = scoreColor(g.opportunityScore, maxScore);
        const selected = selectedZoneId === g.id;
        return (
          <Fragment key={g.id}>
            <Circle
              center={[g.lat, g.lng]}
              radius={g.radiusMeters}
              pathOptions={{
                color: selected ? '#15803d' : color,
                weight: selected ? 3 : 2,
                fillColor: color,
                fillOpacity: selected ? 0.28 : 0.16,
              }}
              eventHandlers={{
                click: () => onSelectZone(g),
              }}
            />
            <Marker
              ref={registerLayerRef(g.id)}
              position={[g.lat, g.lng]}
              icon={rankedLabelIcon(g.rank, color)}
              eventHandlers={{
                click: () => onSelectZone(g),
              }}
            >
              <Popup className="reports-viz-popup" autoPanPadding={[24, 24]} maxWidth={320}>
                <div className="min-w-[180px] space-y-1 text-sm text-neutral-900">
                  <p className="font-semibold text-neutral-900">
                    {g.label} ({g.competitorCount} competitors)
                  </p>
                  {g.address ? (
                    <p className="text-xs text-neutral-700">{g.address}</p>
                  ) : null}
                  <p className="font-medium text-neutral-900">
                    Pool: {formatZarShort(g.addressablePoolZAR)}/mo
                  </p>
                  <PotentialBreakdown
                    potentialLowZAR={g.potentialLowZAR}
                    potentialHighZAR={g.potentialHighZAR}
                  />
                  <p className="font-medium text-neutral-900">
                    {g.competitorCount} competitors · {g.clientCount} clients
                  </p>
                  <p className="text-xs text-neutral-700">{brandSummary(g.byBrand)}</p>
                </div>
              </Popup>
            </Marker>
          </Fragment>
        );
      })}
    </>
  );
}
