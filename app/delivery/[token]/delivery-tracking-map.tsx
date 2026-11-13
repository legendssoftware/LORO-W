'use client';

import { useEffect } from 'react';
import {
  Map as MapView,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  useMap,
} from '@/components/ui/map';

interface MapPoint {
  lat: number;
  lng: number;
}

interface DeliveryTrackingMapProps {
  clientName: string;
  driverFirstName: string;
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

function FitBothPoints({
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
 * One-stop map using the same MapLibre view, markers, and controls as the visits report.
 */
export function DeliveryTrackingMap({
  clientName,
  driverFirstName,
  latitude,
  longitude,
  arrivalLat,
  arrivalLng,
}: DeliveryTrackingMapProps) {
  const drop = parseStoredCoords(latitude, longitude);
  const driver = parseStoredCoords(arrivalLat, arrivalLng);
  const destination = clientName.trim() || 'Delivery address';
  const driverLabel = driverFirstName.trim() || 'Driver';

  if (!drop) {
    return <p className="text-muted-foreground text-sm">Location is not available for this delivery.</p>;
  }

  const showRoute = driver != null && !isSamePoint(drop, driver);
  const bounds = showRoute && driver
    ? ([
        [Math.min(drop.lng, driver.lng), Math.min(drop.lat, driver.lat)],
        [Math.max(drop.lng, driver.lng), Math.max(drop.lat, driver.lat)],
      ] as [[number, number], [number, number]])
    : undefined;

  return (
    <div className="relative h-[280px] w-full overflow-hidden rounded-lg border border-border">
      <MapView center={[drop.lng, drop.lat]} zoom={14} className="size-full">
        <MapControls showZoom showLocate showFullscreen />
        <FitBothPoints bounds={bounds ?? null} />
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
        <MapMarker longitude={drop.lng} latitude={drop.lat}>
          <MarkerContent>
            <span
              className="block size-3 rounded-full border-2 border-white bg-violet-600"
              role="img"
              aria-label={`Delivery destination, ${destination}`}
            />
            <MarkerLabel position="top" className="bg-background/90 border-border max-w-[10rem] truncate rounded border px-1.5 py-0.5">
              {destination}
            </MarkerLabel>
          </MarkerContent>
        </MapMarker>
        {driver ? (
          <MapMarker longitude={driver.lng} latitude={driver.lat}>
            <MarkerContent>
              <span
                className="block size-3 rounded-full border-2 border-white bg-emerald-600"
                role="img"
                aria-label={`Driver location, ${driverLabel}`}
              />
              <MarkerLabel position="bottom" className="bg-background/90 border-border max-w-[10rem] truncate rounded border px-1.5 py-0.5">
                {driverLabel}
              </MarkerLabel>
            </MarkerContent>
          </MapMarker>
        ) : null}
      </MapView>
    </div>
  );
}
