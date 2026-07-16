'use client';

import { useEffect, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { useMap, useMapEvents } from 'react-leaflet';

/** Minimum zoom before influence geofence circles render (avoids thousands of layers at world view). */
export const INFLUENCE_CIRCLES_MIN_ZOOM = 13;

function readMapZoom(map: LeafletMap): number {
  return Math.round(map.getZoom());
}

/** Tracks Leaflet map zoom for gating heavy overlays. */
export function useMapZoom(): number {
  const map = useMap();
  const [zoom, setZoom] = useState(() => readMapZoom(map));

  useMapEvents({
    zoomend: () => setZoom(readMapZoom(map)),
  });

  useEffect(() => {
    setZoom(readMapZoom(map));
  }, [map]);

  return zoom;
}

/** Tracks Leaflet map bounds for viewport culling of heavy marker layers. */
export function useMapBounds(): L.LatLngBounds | null {
  const map = useMap();
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(() =>
    map.getBounds()
  );

  useMapEvents({
    moveend: () => setBounds(map.getBounds()),
    zoomend: () => setBounds(map.getBounds()),
  });

  useEffect(() => {
    setBounds(map.getBounds());
  }, [map]);

  return bounds;
}
