'use client';

import { Fragment } from 'react';
import { Circle, Marker, Popup, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useEffect } from 'react';
import type {
  BranchCatchmentOpportunity,
  GreenfieldOpportunityZone,
  SiteOpportunityZone,
} from '@/api/types/site-opportunity';

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
      display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25);
    ">${rank}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function SiteOpportunityMapOverlays({
  catchments,
  greenfield,
  selectedZoneId,
  onSelectZone,
}: {
  catchments: BranchCatchmentOpportunity[];
  greenfield: GreenfieldOpportunityZone[];
  selectedZoneId: string | null;
  onSelectZone: (zone: SiteOpportunityZone) => void;
}) {
  const maxScore = Math.max(
    ...catchments.map((c) => c.opportunityScore),
    ...greenfield.map((g) => g.opportunityScore),
    1
  );

  return (
    <>
      {catchments.map((c) => {
        const color = scoreColor(c.opportunityScore, maxScore);
        const selected = selectedZoneId === c.id;
        return (
          <Circle
            key={c.id}
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
          />
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
              position={[g.lat, g.lng]}
              icon={rankedLabelIcon(g.rank, color)}
              eventHandlers={{
                click: () => onSelectZone(g),
              }}
            >
              <Popup>
                <div className="text-sm space-y-1 p-1">
                  <p className="font-semibold">#{g.rank} {g.label}</p>
                  <p>{g.competitorCount} competitors · {g.clientCount} clients</p>
                </div>
              </Popup>
            </Marker>
          </Fragment>
        );
      })}
    </>
  );
}

export function PanToSelectedZone({
  zone,
}: {
  zone: SiteOpportunityZone | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!zone) return;
    map.flyTo([zone.lat, zone.lng], Math.max(map.getZoom(), 12), {
      duration: 0.5,
    });
  }, [map, zone?.id, zone?.lat, zone?.lng]);
  return null;
}
