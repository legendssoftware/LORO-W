'use client';

import { useEffect, useMemo, useState } from 'react';
import type { InfluenceCircle, MapMarkerBase } from '@/api/types/map';
import { useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBounds, Map as LeafletMap } from 'leaflet';

const DEBOUNCE_MS = 100;
export const VIEWPORT_CULL_THRESHOLD = 400;
export const VIEWPORT_CULL_PADDING = 0.15;

function readBounds(map: LeafletMap): LatLngBounds {
  return map.getBounds();
}

/** Debounced map bounds for viewport culling. */
export function useMapViewportBounds(): LatLngBounds | null {
  const map = useMap();
  const [bounds, setBounds] = useState<LatLngBounds | null>(() => readBounds(map));

  useMapEvents({
    moveend: () => setBounds(readBounds(map)),
    zoomend: () => setBounds(readBounds(map)),
  });

  useEffect(() => {
    setBounds(readBounds(map));
  }, [map]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMove = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setBounds(readBounds(map)), DEBOUNCE_MS);
    };
    map.on('move', onMove);
    return () => {
      if (timer) clearTimeout(timer);
      map.off('move', onMove);
    };
  }, [map]);

  return bounds;
}

function markerInBounds(
  lat: number,
  lng: number,
  bounds: LatLngBounds,
  padding: number
): boolean {
  const padLat = (bounds.getNorth() - bounds.getSouth()) * padding;
  const padLng = (bounds.getEast() - bounds.getWest()) * padding;
  const south = bounds.getSouth() - padLat;
  const north = bounds.getNorth() + padLat;
  const west = bounds.getWest() - padLng;
  const east = bounds.getEast() + padLng;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

export function cullMarkersToViewport(
  markers: MapMarkerBase[],
  bounds: LatLngBounds | null,
  threshold = VIEWPORT_CULL_THRESHOLD
): MapMarkerBase[] {
  if (!bounds || markers.length <= threshold) return markers;

  return markers.filter((m) => {
    const lat = Number(m.latitude);
    const lng = Number(m.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
    return markerInBounds(lat, lng, bounds, VIEWPORT_CULL_PADDING);
  });
}

export function cullCirclesToViewport(
  circles: InfluenceCircle[],
  bounds: LatLngBounds | null,
  threshold = VIEWPORT_CULL_THRESHOLD
): InfluenceCircle[] {
  if (!bounds || circles.length <= threshold) return circles;

  return circles.filter((c) =>
    markerInBounds(c.latitude, c.longitude, bounds, VIEWPORT_CULL_PADDING)
  );
}

export function useViewportMarkers(
  markers: MapMarkerBase[],
  threshold = VIEWPORT_CULL_THRESHOLD
): MapMarkerBase[] {
  const bounds = useMapViewportBounds();
  return useMemo(
    () => cullMarkersToViewport(markers, bounds, threshold),
    [markers, bounds, threshold]
  );
}

export function useViewportCircles(
  circles: InfluenceCircle[],
  threshold = VIEWPORT_CULL_THRESHOLD
): InfluenceCircle[] {
  const bounds = useMapViewportBounds();
  return useMemo(
    () => cullCirclesToViewport(circles, bounds, threshold),
    [circles, bounds, threshold]
  );
}
