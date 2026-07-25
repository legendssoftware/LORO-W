'use client';

import { useMemo } from 'react';
import { MapGeoJSON } from '@/components/ui/map';
import { useVisualiserSimulation } from '@/app/visualiser/simulation-context';
import { opportunityZonesToFeatureCollection } from '@/lib/site-opportunity/circle-geojson';

/**
 * 5 km catchment / greenfield radius overlays after a simulation run.
 */
export function SimulationOverlayLayer() {
  const { isActive, allZones, selectedZoneId, selectZone } = useVisualiserSimulation();

  const data = useMemo(() => {
    if (!isActive || allZones.length === 0) {
      return { type: 'FeatureCollection' as const, features: [] };
    }
    return opportunityZonesToFeatureCollection(
      allZones.map((z) => ({
        id: z.id,
        kind: z.kind,
        lat: z.lat,
        lng: z.lng,
        radiusMeters: z.radiusMeters,
        label: z.kind === 'catchment' ? z.branchName : z.label,
      })),
    );
  }, [isActive, allZones]);

  const selected = selectedZoneId ?? '';

  if (!isActive || data.features.length === 0) return null;

  return (
    <MapGeoJSON
      id="site-opportunity-zones"
      data={data}
      promoteId="id"
      interactive
      fillPaint={{
        'fill-color': [
          'case',
          ['==', ['get', 'id'], selected],
          '#0d9488',
          '#64748b',
        ],
        'fill-opacity': 0.14,
      }}
      linePaint={{
        'line-color': [
          'case',
          ['==', ['get', 'id'], selected],
          '#0f766e',
          '#475569',
        ],
        'line-width': 2,
        'line-opacity': 0.9,
      }}
      onClick={(e) => {
        const id = e.feature.properties?.id;
        if (typeof id === 'string') selectZone(id);
      }}
    />
  );
}
