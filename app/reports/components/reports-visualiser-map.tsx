'use client';

import { useMemo, useEffect, useRef, memo, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import L from 'leaflet';
import type { InfluenceCircle, MapMarkerBase } from '@/api/types/map';
import { cn } from '@/lib/utils';
import { MapMarkerDetailPopup } from './map-marker-detail-popup';
import {
  MARKER_COLORS,
  MARKER_TYPE_LABELS,
  influenceColorForKind,
} from './map-report-constants';

import 'leaflet/dist/leaflet.css';

const customMarkerStyles = `
  .reports-viz-marker.leaflet-div-icon {
    border: none !important;
    background: transparent !important;
  }
`;

const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473];
const DEFAULT_ZOOM = 10;

const LEGEND_ORDER = [
  'branch',
  'client',
  'competitor',
  'lead',
  'check-in-visit',
  'quotation',
  'shift-start',
  'shift-end',
  'break-start',
  'break-end',
  'check-in',
  'task',
  'journal',
  'claim',
] as const;

const iconCache = new Map<string, ReturnType<typeof divIcon>>();

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
  if (mt === 'client') return (marker.logoUrl as string) || (marker.logo as string) || undefined;
  if (mt === 'competitor') return marker.logoUrl as string | undefined;
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
    competitor: 'R',
    client: 'C',
    lead: 'L',
    claim: 'K',
  };
  return m[markerType] ?? markerType.slice(0, 1).toUpperCase();
}

function ReportMapMarkerIcon({ marker }: { marker: MapMarkerBase }) {
  const mt = String(marker.markerType ?? 'unknown');
  const ring = MARKER_COLORS[mt] ?? '#64748b';
  const ringWidth = mt === 'check-in' ? 4 : 3;
  const size = 36;
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
        width: size,
        height: size,
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
  const img = resolveMarkerImageUrl(marker) ?? '';
  const key = `${marker.id}-${mt}-${img}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const html = renderToStaticMarkup(createElement(ReportMapMarkerIcon, { marker }));
  const icon = divIcon({
    html,
    className: 'reports-viz-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
  iconCache.set(key, icon);
  return icon;
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

function MapLegend() {
  return (
    <div className="absolute top-3 left-3 z-[1000] max-w-[200px] rounded-md border bg-background/95 px-3 py-2 text-xs shadow backdrop-blur-sm">
      <p className="font-semibold text-foreground mb-1.5">Map key</p>
      <ul className="space-y-1">
        {LEGEND_ORDER.map((id) => {
          const color = MARKER_COLORS[id];
          const label = MARKER_TYPE_LABELS[id] ?? id;
          if (!color) return null;
          return (
            <li key={id} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/80 shadow"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground leading-tight">{label}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-muted-foreground mt-2 leading-snug">
        Rings match marker type; shaded circles show influence radius.
      </p>
    </div>
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
            Loading attendance and map layers…
          </div>
        ) : null}
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
          {allMarkers.map((m, idx) => {
            const lat = Number(m.latitude);
            const lng = Number(m.longitude);
            if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
            return (
              <Marker
                key={`${String(m.id)}-${idx}`}
                position={[lat, lng]}
                icon={getMarkerIcon(m)}
              >
                <Popup className="reports-viz-popup">
                  <MapMarkerDetailPopup marker={m} />
                </Popup>
              </Marker>
            );
          })}
          <MapLegend />
          <LocationButton />
        </MapContainer>
      </div>
    </div>
  );
}

export const ReportsVisualiserMap = memo(ReportsVisualiserMapInner);
