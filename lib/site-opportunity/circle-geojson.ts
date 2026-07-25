import type * as GeoJSON from 'geojson';

/** Approximate a geodesic circle as a GeoJSON polygon (lng/lat rings). */
export function circlePolygon(
  lat: number,
  lng: number,
  radiusMeters: number,
  steps = 64,
): GeoJSON.Polygon {
  const coords: [number, number][] = [];
  const earthRadius = 6_371_000;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const angular = radiusMeters / earthRadius;

  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(angular) +
        Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing),
    );
    const lng2 =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
        Math.cos(angular) - Math.sin(latRad) * Math.sin(lat2),
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return { type: 'Polygon', coordinates: [coords] };
}

export function opportunityZonesToFeatureCollection(
  zones: Array<{
    id: string;
    kind: string;
    lat: number;
    lng: number;
    radiusMeters: number;
    label?: string;
  }>,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zones.map((z) => ({
      type: 'Feature' as const,
      properties: {
        id: z.id,
        kind: z.kind,
        label: z.label ?? z.id,
      },
      geometry: circlePolygon(z.lat, z.lng, z.radiusMeters),
    })),
  };
}
