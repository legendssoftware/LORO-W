'use client';

import { useMemo, useEffect, useRef, useState, memo, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  ScaleControl,
  useMap,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { divIcon } from 'leaflet';
import L from 'leaflet';
import type { InfluenceCircle, MapMarkerBase } from '@/api/types/map';
import { cn } from '@/lib/utils';
import { MapMarkerDetailPopup } from './map-marker-detail-popup';
import {
  MARKER_COLORS,
  ORG_SITE_MAP_MARKER,
  ORG_SITE_MARKER_SIZE,
  influenceColorForKind,
} from './map-report-constants';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const customMarkerStyles = `
  .reports-viz-marker.leaflet-div-icon {
    border: none !important;
    background: transparent !important;
  }

  .reports-viz-popup .leaflet-popup-content-wrapper {
    border-radius: 8px;
  }

  .reports-viz-popup .leaflet-popup-content {
    margin: 0;
    padding: 14px 16px;
  }

  .reports-viz-popup .leaflet-popup-close-button {
    top: 10px !important;
    right: 10px !important;
    width: 32px !important;
    height: 32px !important;
    padding: 0 !important;
    border-radius: 9999px;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #dc2626 !important;
    font-size: 0 !important;
    line-height: 0 !important;
    text-align: center;
    box-shadow: none;
    display: flex !important;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s, color 0.15s, border-color 0.15s;
  }

  .reports-viz-popup .leaflet-popup-close-button::after {
    content: '';
    display: block;
    width: 16px;
    height: 16px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23dc2626' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 6 6 18'/%3E%3Cpath d='m6 6 12 12'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 16px 16px;
  }

  .reports-viz-popup .leaflet-popup-close-button:hover {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #b91c1c !important;
    opacity: 1;
  }

  .reports-viz-popup .leaflet-popup-close-button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #fff, 0 0 0 4px #fca5a5;
  }
`;

const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473];
const DEFAULT_ZOOM = 10;
const MARKER_SIZE = 36;
const MARKER_ANCHOR = MARKER_SIZE / 2;

const iconCache = new Map<string, ReturnType<typeof divIcon>>();
const orgSiteIconCache = new Map<'client' | 'competitor', ReturnType<typeof divIcon>>();

const CLUSTER_MARKER_TYPES = new Set(['client', 'competitor']);

function getInitials(name: string): string {
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return '?';
  return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

/** Owner-based label for visit pins (same idea as shift markers). */
function initialsSourceForVisitMarker(marker: MapMarkerBase): string {
  const o = marker.owner as { name?: string; surname?: string } | undefined;
  const fromOwner = [o?.name, o?.surname].filter(Boolean).join(' ').trim();
  if (fromOwner) return fromOwner;
  return String(marker.name ?? marker.id ?? 'visit');
}

/** Owner-based label for lead pins (assignee avatar ring). */
function initialsSourceForLeadMarker(marker: MapMarkerBase): string {
  const o = marker.owner as { name?: string; surname?: string } | undefined;
  const fromOwner = [o?.name, o?.surname].filter(Boolean).join(' ').trim();
  if (fromOwner) return fromOwner;
  return String(marker.name ?? marker.id ?? 'lead');
}

function resolveMarkerImageUrl(marker: MapMarkerBase): string | undefined {
  const mt = String(marker.markerType ?? '');
  if (
    ['check-in', 'shift-start', 'shift-end', 'break-start', 'break-end', 'claim'].includes(mt)
  ) {
    const img = marker.image as string | undefined;
    const owner = marker.owner as { photoURL?: string; avatar?: string } | undefined;
    return img || owner?.photoURL || owner?.avatar;
  }
  if (mt === 'branch') return marker.logoUrl as string | undefined;
  if (mt === 'lead') {
    const img = marker.image as string | undefined;
    const owner = marker.owner as { photoURL?: string; avatar?: string } | undefined;
    const ld = marker.leadData as { image?: string } | undefined;
    const loc = marker.location as { imageUrl?: string } | undefined;
    return (
      img ||
      owner?.photoURL ||
      owner?.avatar ||
      ld?.image ||
      loc?.imageUrl
    );
  }
  if (mt === 'check-in-visit') {
    const img = marker.image as string | undefined;
    const owner = marker.owner as { photoURL?: string; avatar?: string } | undefined;
    const ci = marker.checkInData as { checkInPhoto?: string } | undefined;
    return img || owner?.photoURL || owner?.avatar || ci?.checkInPhoto;
  }
  return undefined;
}

function genericPlaceholderChar(markerType: string): string {
  const m: Record<string, string> = {
    branch: 'B',
    quotation: 'Q',
    task: 'T',
    journal: 'J',
    'check-in-visit': 'V',
    lead: 'L',
    claim: 'K',
  };
  return m[markerType] ?? markerType.slice(0, 1).toUpperCase();
}

function createOrgSiteMarkerIcon(
  markerType: 'client' | 'competitor'
): ReturnType<typeof divIcon> {
  const cached = orgSiteIconCache.get(markerType);
  if (cached) return cached;

  const { bg, Icon } = ORG_SITE_MAP_MARKER[markerType];
  const size = ORG_SITE_MARKER_SIZE;
  const html = renderToStaticMarkup(
    createElement(
      'div',
      {
        style: {
          backgroundColor: bg,
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.28)',
        },
      },
      createElement(Icon, {
        size: 16,
        color: 'white',
        strokeWidth: 2.5,
      })
    )
  );
  const icon = divIcon({
    html,
    className: 'reports-viz-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  orgSiteIconCache.set(markerType, icon);
  return icon;
}

function ReportMapMarkerIcon({ marker }: { marker: MapMarkerBase }) {
  const mt = String(marker.markerType ?? 'unknown');
  const ring = MARKER_COLORS[mt] ?? '#64748b';
  const ringWidth = mt === 'check-in' ? 4 : 3;
  const imgUrl = resolveMarkerImageUrl(marker);
  const name = String(marker.name ?? marker.id ?? mt);
  const initialsLabel =
    mt === 'check-in-visit'
      ? initialsSourceForVisitMarker(marker)
      : mt === 'lead'
        ? initialsSourceForLeadMarker(marker)
        : name;

  const inner = imgUrl ? (
    createElement('img', {
      src: imgUrl,
      alt: '',
      referrerPolicy: 'no-referrer',
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '50%',
        display: 'block',
      },
    })
  ) : (
    createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#e2e8f0',
          color: '#475569',
          fontSize: mt === 'branch' || mt === 'quotation' ? 13 : 11,
          fontWeight: 700,
          fontFamily: 'system-ui, sans-serif',
        },
      },
      [
        'check-in',
        'shift-start',
        'shift-end',
        'break-start',
        'break-end',
        'claim',
        'check-in-visit',
        'lead',
      ].includes(mt)
        ? getInitials(initialsLabel)
        : genericPlaceholderChar(mt)
    )
  );

  return createElement(
    'div',
    {
      style: {
        width: MARKER_SIZE,
        height: MARKER_SIZE,
        borderRadius: '50%',
        border: `${ringWidth}px solid ${ring}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.28)',
        overflow: 'hidden',
        background: '#fff',
        boxSizing: 'border-box',
      },
    },
    inner
  );
}

function getMarkerIcon(marker: MapMarkerBase): ReturnType<typeof divIcon> {
  const mt = String(marker.markerType ?? 'unknown');
  if (mt === 'client' || mt === 'competitor') {
    return createOrgSiteMarkerIcon(mt);
  }

  const img = resolveMarkerImageUrl(marker) ?? '';
  const key = `${marker.id}-${mt}-${img}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const html = renderToStaticMarkup(createElement(ReportMapMarkerIcon, { marker }));
  const icon = divIcon({
    html,
    className: 'reports-viz-marker',
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [MARKER_ANCHOR, MARKER_ANCHOR],
  });
  iconCache.set(key, icon);
  return icon;
}

function markerPosition(marker: MapMarkerBase): [number, number] | null {
  const lat = Number(marker.latitude);
  const lng = Number(marker.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
}

function circlePathOptions(kind: string) {
  const fill = influenceColorForKind(kind);
  return {
    color: fill,
    fillColor: fill,
    fillOpacity: 0.16,
    weight: 1,
    opacity: 0.55,
    dashArray: '4 8' as const,
  };
}

function FitReportBounds({
  markers,
  circles,
}: {
  markers: MapMarkerBase[];
  circles: InfluenceCircle[];
}) {
  const map = useMap();
  const lastKeyRef = useRef<string>('');

  const boundsKey = useMemo(() => {
    const pts: string[] = [];
    for (const m of markers) {
      if (m.latitude != null && m.longitude != null) {
        pts.push(`${m.latitude.toFixed(5)},${m.longitude.toFixed(5)}`);
      }
    }
    for (const c of circles) {
      pts.push(`${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`);
    }
    pts.sort();
    return pts.join('|');
  }, [markers, circles]);

  useEffect(() => {
    if (boundsKey === lastKeyRef.current) return;
    lastKeyRef.current = boundsKey;

    const latLngs: L.LatLngExpression[] = [];
    for (const m of markers) {
      if (m.latitude != null && m.longitude != null) {
        latLngs.push([m.latitude, m.longitude]);
      }
    }
    for (const c of circles) {
      latLngs.push([c.latitude, c.longitude]);
    }
    if (latLngs.length === 0) return;
    if (latLngs.length === 1) {
      map.setView(latLngs[0], DEFAULT_ZOOM);
      return;
    }
    const b = L.latLngBounds(latLngs);
    map.fitBounds(b, { padding: [32, 32], maxZoom: 14 });
  }, [map, boundsKey, markers, circles]);

  return null;
}

function LocationButton() {
  const map = useMap();
  return (
    <button
      type="button"
      className="absolute bottom-4 left-4 z-[1000] rounded-md border bg-background px-3 py-1.5 text-sm shadow"
      onClick={() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            map.setView([pos.coords.latitude, pos.coords.longitude], map.getZoom());
          },
          () => {},
          { enableHighAccuracy: true }
        );
      }}
    >
      Use my location
    </button>
  );
}

const popupAnchorIcon = divIcon({
  className: 'reports-viz-marker',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

function SelectedMarkerPopup({
  selectedMarker,
  onClose,
}: {
  selectedMarker: MapMarkerBase | null;
  onClose: () => void;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const position = selectedMarker ? markerPosition(selectedMarker) : null;

  useEffect(() => {
    if (!position) return;
    map.panTo(position, { animate: true, duration: 0.25 });
  }, [map, position]);

  useEffect(() => {
    if (!position) return;
    const id = window.setTimeout(() => markerRef.current?.openPopup(), 0);
    return () => window.clearTimeout(id);
  }, [position, selectedMarker?.id]);

  if (!selectedMarker || !position) return null;

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={popupAnchorIcon}
      zIndexOffset={1000}
      eventHandlers={{
        popupclose: onClose,
      }}
    >
      <Popup className="reports-viz-popup">
        <MapMarkerDetailPopup marker={selectedMarker} />
      </Popup>
    </Marker>
  );
}

function MapMarkerLayers({
  allMarkers,
  onSelectMarker,
}: {
  allMarkers: MapMarkerBase[];
  onSelectMarker: (marker: MapMarkerBase) => void;
}) {
  const { clusterMarkers, otherMarkers } = useMemo(() => {
    const cluster: MapMarkerBase[] = [];
    const other: MapMarkerBase[] = [];
    for (const m of allMarkers) {
      const mt = String(m.markerType ?? '');
      if (CLUSTER_MARKER_TYPES.has(mt)) cluster.push(m);
      else other.push(m);
    }
    return { clusterMarkers: cluster, otherMarkers: other };
  }, [allMarkers]);

  const renderClickableMarker = (m: MapMarkerBase, key: string) => {
    const position = markerPosition(m);
    if (!position) return null;
    return (
      <Marker
        key={key}
        position={position}
        icon={getMarkerIcon(m)}
        eventHandlers={{
          click: () => onSelectMarker(m),
        }}
      />
    );
  };

  return (
    <>
      {clusterMarkers.length > 0 ? (
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          disableClusteringAtZoom={16}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
        >
          {clusterMarkers.map((m, idx) =>
            renderClickableMarker(m, `cluster-${String(m.id)}-${idx}`)
          )}
        </MarkerClusterGroup>
      ) : null}
      {otherMarkers.map((m, idx) => renderClickableMarker(m, `other-${String(m.id)}-${idx}`))}
    </>
  );
}

export interface ReportsVisualiserMapProps {
  allMarkers: MapMarkerBase[];
  influenceCircles: InfluenceCircle[];
  className?: string;
  /** Non-blocking banner while /reports/map is loading or refetching */
  mapLayerBusy?: boolean;
}

function ReportsVisualiserMapInner({
  allMarkers,
  influenceCircles,
  className,
  mapLayerBusy = false,
}: ReportsVisualiserMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerBase | null>(null);

  const visibleSelectedMarker = useMemo(() => {
    if (!selectedMarker) return null;
    return (
      allMarkers.find((m) => String(m.id) === String(selectedMarker.id)) ?? null
    );
  }, [allMarkers, selectedMarker]);

  const center = useMemo((): [number, number] => {
    if (allMarkers.length === 0 && influenceCircles.length === 0) return DEFAULT_CENTER;
    const first =
      allMarkers.find((m) => m.latitude != null && m.longitude != null) ?? null;
    if (first) return [Number(first.latitude), Number(first.longitude)];
    const c0 = influenceCircles[0];
    if (c0) return [c0.latitude, c0.longitude];
    return DEFAULT_CENTER;
  }, [allMarkers, influenceCircles]);

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <style dangerouslySetInnerHTML={{ __html: customMarkerStyles }} />
      <div className="flex-1 min-h-0 rounded border overflow-hidden bg-muted/30 relative">
        {mapLayerBusy ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[2000] border-b border-border/80 bg-background/90 px-3 py-2 text-center text-xs text-muted-foreground backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            Loading map layers…
          </div>
        ) : null}
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          scrollWheelZoom
          preferCanvas
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ScaleControl position="bottomright" imperial={false} />
          <FitReportBounds markers={allMarkers} circles={influenceCircles} />
          {influenceCircles.map((c) => {
            const k = String(c.kind ?? c.markerType ?? 'client');
            return (
              <Circle
                key={c.id}
                center={[c.latitude, c.longitude]}
                radius={c.radiusMeters}
                pathOptions={circlePathOptions(k)}
              />
            );
          })}
          <MapMarkerLayers
            allMarkers={allMarkers}
            onSelectMarker={setSelectedMarker}
          />
          <SelectedMarkerPopup
            selectedMarker={visibleSelectedMarker}
            onClose={() => setSelectedMarker(null)}
          />
          <LocationButton />
        </MapContainer>
      </div>
    </div>
  );
}

export const ReportsVisualiserMap = memo(ReportsVisualiserMapInner);
