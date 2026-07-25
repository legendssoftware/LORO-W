'use client';

import { useMemo } from 'react';
import { MapGeoJSON, useMap } from '@/components/ui/map';
import { useVisualiserSimulation } from '@/app/visualiser/simulation-context';
import { opportunityZonesToFeatureCollection } from '@/lib/site-opportunity/circle-geojson';

/**
 * 5 km catchment / opportunity radius overlays after a simulation run.
 * Clicks prefer competitor/branch marker layers when both hit the same point.
 */
export function SimulationOverlayLayer() {
  const { map } = useMap();
  const { isActive, allZones, selectedZoneId, selectZone } =
    useVisualiserSimulation();

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
        if (map) {
          const styleLayers = map.getStyle()?.layers ?? [];
          const markerLayerIds = styleLayers
            .map((layer) => layer.id)
            .filter(
              (id) =>
                id.includes('logo-unclustered') ||
                id.includes('logo-clusters') ||
                id.includes('logo-cluster-count'),
            );
          if (markerLayerIds.length > 0) {
            const hits = map.queryRenderedFeatures(e.originalEvent.point, {
              layers: markerLayerIds.filter((id) => map.getLayer(id)),
            });
            if (hits.length > 0) return;
          }
        }
        const id = e.feature.properties?.id;
        if (typeof id === 'string') selectZone(id);
      }}
    />
  );
}
