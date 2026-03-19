'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MapDataResponse, MapMarkerBase } from '@/api/types/map';
import { LocationButton } from '@/components/visits-table/visits-map';
import { cn } from '@/lib/utils';

import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473];
const DEFAULT_ZOOM = 10;
const REGION_ZOOM = 6;

/** Fix default Leaflet icon path (broken with some bundlers). Run once on mount. */
function useFixLeafletIcon() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }, []);
}

function getMarkersBoundsKey(markers: MapMarkerBase[]): string {
  if (markers.length === 0) return 'empty';
  if (markers.length === 1) return `single:${markers[0].position[0]},${markers[0].position[1]}`;
  const lats = markers.map((m) => m.position[0]);
  const lngs = markers.map((m) => m.position[1]);
  return `bounds:${Math.min(...lats).toFixed(5)},${Math.max(...lats).toFixed(5)},${Math.min(...lngs).toFixed(5)},${Math.max(...lngs).toFixed(5)}`;
}

function FitBoundsReport({ markers }: { markers: MapMarkerBase[] }) {
  const map = useMap();
  const lastBoundsKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (markers.length === 0) return;
    const boundsKey = getMarkersBoundsKey(markers);
    if (lastBoundsKeyRef.current === boundsKey) return;
    lastBoundsKeyRef.current = boundsKey;
    if (markers.length === 1) {
      map.setView(markers[0].position, REGION_ZOOM);
      return;
    }
    const latMin = Math.min(...markers.map((m) => m.position[0]));
    const latMax = Math.max(...markers.map((m) => m.position[0]));
    const lngMin = Math.min(...markers.map((m) => m.position[1]));
    const lngMax = Math.max(...markers.map((m) => m.position[1]));
    const center: [number, number] = [(latMin + latMax) / 2, (lngMin + lngMax) / 2];
    map.setView(center, REGION_ZOOM);
  }, [map, markers]);
  return null;
}

export interface ReportsMapInnerProps {
  data: MapDataResponse;
  className?: string;
}

export function ReportsMapInner({ data, className }: ReportsMapInnerProps) {
  useFixLeafletIcon();

  const center: [number, number] = data.mapConfig?.defaultCenter
    ? [data.mapConfig.defaultCenter.lat, data.mapConfig.defaultCenter.lng]
    : DEFAULT_CENTER;

  const markers: MapMarkerBase[] = data.allMarkers ?? [];

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <div className="flex-1 min-h-0 rounded border overflow-hidden bg-muted/30">
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBoundsReport markers={markers} />
          {markers.map((marker) => (
            <Marker key={String(marker.id)} position={marker.position}>
              <Popup>
                <div className="min-w-[140px]">
                  <p className="font-medium">{marker.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{marker.markerType?.replace(/-/g, ' ')}</p>
                  {(marker as MapMarkerBase & { location?: { address?: string } }).location?.address && (
                    <p className="text-xs mt-1">{(marker as MapMarkerBase & { location?: { address?: string } }).location?.address}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          <LocationButton />
        </MapContainer>
      </div>
    </div>
  );
}
