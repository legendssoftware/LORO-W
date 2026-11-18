'use client';

import { useEffect } from 'react';
import type * as GeoJSON from 'geojson';
import { useMap } from '@/components/ui/map';
import { useGeofenceAreas } from '@/api/hooks/use-geofences';
import { useTokenReady } from '@/api/hooks/use-token-ready';

const SOURCE = 'org-geofence-areas';
const LAYER = 'org-geofence-areas-fill';

function circlePolygon(lat: number, lng: number, radiusMeters: number): GeoJSON.Polygon {
  const steps = 48;
  const earth = 6_371_000;
  const coordinates: [number, number][] = [];
  for (let index = 0; index <= steps; index += 1) {
    const bearing = (index / steps) * Math.PI * 2;
    const lat1 = (lat * Math.PI) / 180;
    const lng1 = (lng * Math.PI) / 180;
    const distance = radiusMeters / earth;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distance) + Math.cos(lat1) * Math.sin(distance) * Math.cos(bearing)
    );
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(distance) * Math.cos(lat1),
      Math.cos(distance) - Math.sin(lat1) * Math.sin(lat2)
    );
    coordinates.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return { type: 'Polygon', coordinates: [coordinates] };
}

/** Draws organisation geofence areas on Competitor Overview. */
export function GeofenceAreasLayer() {
  const { map, isLoaded } = useMap();
  const { isTokenReady } = useTokenReady();
  const areas = useGeofenceAreas({ enabled: isTokenReady });

  useEffect(() => {
    if (!map || !isLoaded) return;
    const features: GeoJSON.Feature[] = (areas.data ?? [])
      .filter((area) => Number.isFinite(area.latitude) && Number.isFinite(area.longitude))
      .map((area) => ({
        type: 'Feature',
        properties: { name: area.name },
        geometry: circlePolygon(area.latitude, area.longitude, area.radius || 500),
      }));
    const collection: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
    const existing = map.getSource(SOURCE) as { setData?: (data: GeoJSON.FeatureCollection) => void } | undefined;
    if (existing?.setData) {
      existing.setData(collection);
      return;
    }
    map.addSource(SOURCE, { type: 'geojson', data: collection });
    map.addLayer({
      id: LAYER,
      type: 'fill',
      source: SOURCE,
      paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.15 },
    });
    return () => {
      if (map.getLayer(LAYER)) map.removeLayer(LAYER);
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    };
  }, [areas.data, isLoaded, map]);

  return null;
}
