'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { InfluenceCircle } from '@/api/types/map';
import { influenceColorForKind } from '@/app/reports/components/map-report-constants';
import { INFLUENCE_PANE } from '@/lib/leaflet/setup-map-panes';
import { INFLUENCE_CIRCLES_MIN_ZOOM } from '@/lib/leaflet/use-map-zoom';

function circleStyle(kind: string, markerColor?: unknown): L.CircleMarkerOptions {
  const fill =
    typeof markerColor === 'string' && markerColor.trim()
      ? markerColor.trim()
      : influenceColorForKind(kind);
  return {
    pane: INFLUENCE_PANE,
    color: fill,
    fillColor: fill,
    fillOpacity: 0.16,
    weight: 1,
    opacity: 0.55,
    dashArray: '4 8',
  };
}

/** Imperative circle layer — one LayerGroup instead of N React Circle children. */
export function InfluenceCirclesCanvasLayer({
  circles,
}: {
  circles: InfluenceCircle[];
}) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const group = groupRef.current ?? L.layerGroup();
    groupRef.current = group;
    if (!map.hasLayer(group)) group.addTo(map);

    const render = () => {
      group.clearLayers();
      if (map.getZoom() < INFLUENCE_CIRCLES_MIN_ZOOM) return;

      for (const c of circles) {
        const k = String(c.kind ?? c.markerType ?? 'client');
        L.circle([c.latitude, c.longitude], {
          radius: c.radiusMeters,
          ...circleStyle(k, c.markerColor),
        }).addTo(group);
      }
    };

    render();
    map.on('zoomend', render);
    map.on('moveend', render);

    return () => {
      map.off('zoomend', render);
      map.off('moveend', render);
      if (map.hasLayer(group)) map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map, circles]);

  return null;
}
