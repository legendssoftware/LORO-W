'use client';

import { useEffect, useMemo } from 'react';
import type { PublicRouteStop } from '@/api/types/epod';
import {
  Map as MapView,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  useMap,
} from '@/components/ui/map';
import { cn } from '@/lib/utils';

interface MapPoint {
  lat: number;
  lng: number;
}

interface DeliveryTrackingMapProps {
  routeStops: PublicRouteStop[];
  latitude: number | null;
  longitude: number | null;
  arrivalLat: number | null;
  arrivalLng: number | null;
}

/** Points closer than this are the same stop, so no connector is drawn. */
const SAME_POINT_DEGREES = 0.00015;

function parseStoredCoords(
  latRaw: number | string | null | undefined,
  lngRaw: number | string | null | undefined,
): MapPoint | null {
  const lat = typeof latRaw === 'string' ? Number.parseFloat(latRaw) : Number(latRaw);
  const lng = typeof lngRaw === 'string' ? Number.parseFloat(lngRaw) : Number(lngRaw);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    (lat === 0 && lng === 0)
  ) {
    return null;
  }
  return { lat, lng };
}

function isSamePoint(left: MapPoint, right: MapPoint): boolean {
  return (
    Math.abs(left.lat - right.lat) < SAME_POINT_DEGREES &&
    Math.abs(left.lng - right.lng) < SAME_POINT_DEGREES
  );
}

function stopLabel(stop: PublicRouteStop): string {
  return stop.isCurrent ? 'Your stop' : `#${stop.stopNumber}`;
}

function FitMapBounds({
  bounds,
}: {
  bounds: [[number, number], [number, number]] | null;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || !bounds) return;
    map.fitBounds(bounds, { padding: 72, maxZoom: 14, duration: 0 });
  }, [bounds, isLoaded, map]);

  return null;
}

/**
 * Bolt-style route map: numbered pins only. Other stops show #N, never a client name.
 */
export function DeliveryTrackingMap({
  routeStops,
  latitude,
  longitude,
  arrivalLat,
  arrivalLng,
}: DeliveryTrackingMapProps) {
  const driver = parseStoredCoords(arrivalLat, arrivalLng);

  const pins = useMemo(() => {
    const fromRoute = routeStops
      .map((stop) => {
        const point = parseStoredCoords(stop.latitude, stop.longitude);
        if (!point) return null;
        return { stop, point };
      })
      .filter((row): row is { stop: PublicRouteStop; point: MapPoint } => row != null);

    if (fromRoute.length > 0) return fromRoute;
    const fallbackDrop = parseStoredCoords(latitude, longitude);
    if (!fallbackDrop) return [];
    return [
      {
        stop: {
          stopNumber: 1,
          latitude: fallbackDrop.lat,
          longitude: fallbackDrop.lng,
          isCurrent: true,
        },
        point: fallbackDrop,
      },
    ];
  }, [latitude, longitude, routeStops]);

  const bounds = useMemo(() => {
    const points: MapPoint[] = pins.map((row) => row.point);
    if (driver) points.push(driver);
    if (points.length < 2) return null;
    let minLng = points[0].lng;
    let maxLng = points[0].lng;
    let minLat = points[0].lat;
    let maxLat = points[0].lat;
    for (const point of points) {
      minLng = Math.min(minLng, point.lng);
      maxLng = Math.max(maxLng, point.lng);
      minLat = Math.min(minLat, point.lat);
      maxLat = Math.max(maxLat, point.lat);
    }
    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ] as [[number, number], [number, number]];
  }, [driver, pins]);

  const currentPin = pins.find((row) => row.stop.isCurrent) ?? pins[0] ?? null;

  if (!currentPin) {
    return <p className="text-muted-foreground text-sm">Location is not available for this delivery.</p>;
  }

  const drop = currentPin.point;
  const showRoute = driver != null && !isSamePoint(drop, driver);

  return (
    <div className="relative h-[280px] w-full overflow-hidden rounded-lg border border-border">
      <MapView center={[drop.lng, drop.lat]} zoom={14} className="size-full">
        <MapControls showZoom showFullscreen />
        <FitMapBounds bounds={bounds} />
        {showRoute && driver ? (
          <MapRoute
            id="delivery-route"
            coordinates={[
              [driver.lng, driver.lat],
              [drop.lng, drop.lat],
            ]}
            color="#7C3AED"
            width={3}
            opacity={0.85}
            dashArray={[2, 2] as [number, number]}
            interactive={false}
          />
        ) : null}
        {pins.map(({ stop, point }) => {
          const label = stopLabel(stop);
          return (
            <MapMarker key={`${stop.stopNumber}-${point.lat}-${point.lng}`} longitude={point.lng} latitude={point.lat}>
              <MarkerContent>
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full border-2 border-white text-xs font-semibold shadow-sm',
                    stop.isCurrent ? 'bg-violet-600 text-white' : 'bg-slate-600 text-white',
                  )}
                  role="img"
                  aria-label={label}
                >
                  {stop.stopNumber}
                </span>
                <MarkerLabel
                  position="top"
                  className="bg-background/90 border-border max-w-[10rem] truncate rounded border px-1.5 py-0.5"
                >
                  {label}
                </MarkerLabel>
              </MarkerContent>
            </MapMarker>
          );
        })}
        {driver ? (
          <MapMarker longitude={driver.lng} latitude={driver.lat}>
            <MarkerContent>
              <span
                className="block size-3 rounded-full border-2 border-white bg-emerald-600"
                role="img"
                aria-label="Arrival point"
              />
              <MarkerLabel
                position="bottom"
                className="bg-background/90 border-border max-w-[10rem] truncate rounded border px-1.5 py-0.5"
              >
                Arrived
              </MarkerLabel>
            </MarkerContent>
          </MapMarker>
        ) : null}
      </MapView>
    </div>
  );
}
