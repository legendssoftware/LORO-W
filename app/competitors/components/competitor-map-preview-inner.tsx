'use client';

import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { divIcon } from 'leaflet';

export function CompetitorMapPreviewInner({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name?: string;
}) {
  const icon = divIcon({
    className: 'competitor-preview-marker',
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:#dc2626;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  return (
    <div className="h-40 w-full overflow-hidden rounded-md border">
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[latitude, longitude]} icon={icon} title={name} />
      </MapContainer>
    </div>
  );
}
