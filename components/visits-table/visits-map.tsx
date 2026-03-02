'use client';

import { useMemo, useCallback, useEffect, useRef, memo, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { MapPin } from 'lucide-react';
import { format } from 'date-fns';
import type { VisitExportItem } from '@/api/types/reports';
import {
  parseCoordString,
  normalizeDurationDisplay,
  buildTelUrl,
  VISITS_TABLE_LINK_CLASS,
} from './visits-table-utils';
import { formatContactAddress } from '@/lib/utils/visits-export';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import 'leaflet/dist/leaflet.css';

const customMarkerStyles = `
  .custom-marker-icon.leaflet-div-icon {
    border: none !important;
    background: transparent !important;
  }
`;

const VISIT_MARKER_SIZE = 24;
const visitIconCache = new Map<string, ReturnType<typeof divIcon>>();

function createVisitMarkerIcon(fillColor: string): ReturnType<typeof divIcon> {
  const cached = visitIconCache.get(fillColor);
  if (cached) return cached;
  const html = renderToStaticMarkup(
    createElement(
      'div',
      {
        className: 'marker-circle',
        style: {
          backgroundColor: fillColor,
          width: VISIT_MARKER_SIZE,
          height: VISIT_MARKER_SIZE,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      createElement(MapPin, {
        size: 14,
        color: 'white',
        strokeWidth: 2.5,
      })
    )
  );
  const icon = divIcon({
    html,
    className: 'custom-marker-icon',
    iconSize: [VISIT_MARKER_SIZE, VISIT_MARKER_SIZE],
    iconAnchor: [VISIT_MARKER_SIZE / 2, VISIT_MARKER_SIZE / 2],
  });
  visitIconCache.set(fillColor, icon);
  return icon;
}

const DEFAULT_ZOOM = 10;
const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473]; // Johannesburg fallback
const ACTIVE_COLOR = '#16a34a';
const ENDED_COLOR = '#dc2626';

export interface VisitMapPoint {
  visit: VisitExportItem;
  lat: number;
  lng: number;
  isActive: boolean;
}

function getVisitPoints(visits: VisitExportItem[]): VisitMapPoint[] {
  const points: VisitMapPoint[] = [];
  for (const visit of visits) {
    const coord =
      parseCoordString(visit.checkInLocation) ??
      parseCoordString(visit.checkOutLocation ?? null);
    if (!coord) continue;
    const [lat, lng] = coord;
    points.push({
      visit,
      lat,
      lng,
      isActive: !visit.checkOutTime,
    });
  }
  return points;
}

function LocationButton() {
  const map = useMap();
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], map.getZoom());
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }, [map]);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="absolute bottom-4 left-4 z-[1000] bg-background shadow"
      onClick={handleLocate}
    >
      Use my location
    </Button>
  );
}

/** Stable key from point positions so we only recenter when the set of locations actually changes. */
function getPointsBoundsKey(points: VisitMapPoint[]): string {
  if (points.length === 0) return 'empty';
  if (points.length === 1) return `single:${points[0].lat},${points[0].lng}`;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);
  return `bounds:${latMin.toFixed(5)},${latMax.toFixed(5)},${lngMin.toFixed(5)},${lngMax.toFixed(5)}`;
}

const REGION_ZOOM = 6;

function FitBounds({ points }: { points: VisitMapPoint[] }) {
  const map = useMap();
  const lastBoundsKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (points.length === 0) return;
    const boundsKey = getPointsBoundsKey(points);
    if (lastBoundsKeyRef.current === boundsKey) return;
    lastBoundsKeyRef.current = boundsKey;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], REGION_ZOOM);
      return;
    }
    const latMin = Math.min(...points.map((p) => p.lat));
    const latMax = Math.max(...points.map((p) => p.lat));
    const lngMin = Math.min(...points.map((p) => p.lng));
    const lngMax = Math.max(...points.map((p) => p.lng));
    const center: [number, number] = [
      (latMin + latMax) / 2,
      (lngMin + lngMax) / 2,
    ];
    map.setView(center, REGION_ZOOM);
  }, [map, points]);
  return null;
}

function PopupContent({ point }: { point: VisitMapPoint }) {
  const { visit, isActive } = point;
  const ownerName = visit.owner
    ? [visit.owner.name, (visit.owner as { surname?: string }).surname]
        .filter(Boolean)
        .join(' ')
        .trim()
    : '-';
  const title = visit.companyName?.trim() || 'Visit';
  const dateTimeLabel = `${format(new Date(visit.checkInTime), 'MMM d, yyyy HH:mm')}${visit.checkOutTime ? ` – ${format(new Date(visit.checkOutTime), 'HH:mm')}` : ''}`;
  const durationStr = normalizeDurationDisplay(visit.duration);
  const clientName = visit.client?.name?.trim() || '-';
  const companyName = visit.companyName?.trim() || '-';
  const contactName = visit.contactFullName?.trim() || '-';
  const cell = visit.contactCellPhone?.trim() || '-';
  const landline = visit.contactLandline?.trim() || '-';
  const email = visit.contactEmail?.trim() || '-';
  const addressStr = formatContactAddress(visit.contactAddress);

  return (
    <article
      className="font-sans text-sm text-foreground min-w-[260px] max-w-[416px] space-y-2"
      aria-labelledby="visit-popup-title"
    >
      <h2
        id="visit-popup-title"
        className="text-base font-semibold text-foreground"
      >
        {title}
      </h2>
      <dl className="space-y-1 text-sm">
        <div>
          <dt className="font-medium text-foreground">Sales person</dt>
          <dd className="text-muted-foreground">
            {ownerName} · #{visit.uid}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Date and time</dt>
          <dd className="text-muted-foreground">
            <time dateTime={visit.checkInTime}>{dateTimeLabel}</time>
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Duration</dt>
          <dd className="text-muted-foreground">{durationStr}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Client</dt>
          <dd className="text-muted-foreground">{clientName}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Company</dt>
          <dd className="text-muted-foreground">{companyName}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Contact</dt>
          <dd className="text-muted-foreground">{contactName}</dd>
        </div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1">
          <div className="min-w-0">
            <dt className="font-medium text-foreground">Cell</dt>
            <dd className="text-muted-foreground truncate">
              {cell !== '-' ? (
                <a
                  href={buildTelUrl(visit.contactCellPhone!)}
                  className={cn(VISITS_TABLE_LINK_CLASS, 'truncate block')}
                  onClick={(e) => e.stopPropagation()}
                >
                  {cell}
                </a>
              ) : (
                cell
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-medium text-foreground">Landline</dt>
            <dd className="text-muted-foreground truncate">
              {landline !== '-' ? (
                <a
                  href={buildTelUrl(visit.contactLandline!)}
                  className={cn(VISITS_TABLE_LINK_CLASS, 'truncate block')}
                  onClick={(e) => e.stopPropagation()}
                >
                  {landline}
                </a>
              ) : (
                landline
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-medium text-foreground">Email</dt>
            <dd className="text-muted-foreground truncate">
              {email !== '-' ? (
                <a
                  href={`mailto:${visit.contactEmail}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(VISITS_TABLE_LINK_CLASS, 'truncate block')}
                  onClick={(e) => e.stopPropagation()}
                >
                  {email}
                </a>
              ) : (
                email
              )}
            </dd>
          </div>
        </div>
        {addressStr !== '-' && (
          <div>
            <dt className="font-medium text-foreground">Address</dt>
            <dd className="text-muted-foreground">{addressStr}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-foreground">Status</dt>
          <dd>
            <span
              className={cn(
                'text-xs font-medium',
                isActive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {isActive ? 'Active' : 'Ended'}
            </span>
          </dd>
        </div>
      </dl>
    </article>
  );
}

export interface VisitsMapProps {
  visits: VisitExportItem[];
  className?: string;
}

function VisitsMapInner({ visits, className }: VisitsMapProps) {
  const points = useMemo(() => getVisitPoints(visits), [visits]);
  const center = useMemo((): [number, number] => {
    if (points.length === 0) return DEFAULT_CENTER;
    if (points.length === 1) return [points[0].lat, points[0].lng];
    const latMin = Math.min(...points.map((p) => p.lat));
    const latMax = Math.max(...points.map((p) => p.lat));
    const lngMin = Math.min(...points.map((p) => p.lng));
    const lngMax = Math.max(...points.map((p) => p.lng));
    return [(latMin + latMax) / 2, (lngMin + lngMax) / 2];
  }, [points]);

  const skippedCount = visits.length - points.length;

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <style dangerouslySetInnerHTML={{ __html: customMarkerStyles }} />
      {skippedCount > 0 && (
        <p className="text-xs text-muted-foreground mb-2 shrink-0">
          {skippedCount} visit{skippedCount !== 1 ? 's' : ''} have no coordinates
          and are not shown on the map.
        </p>
      )}
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
          <FitBounds points={points} />
          {points.map((point) => (
            <Marker
              key={point.visit.uid}
              position={[point.lat, point.lng]}
              icon={createVisitMarkerIcon(
                point.isActive ? ACTIVE_COLOR : ENDED_COLOR
              )}
            >
              <Popup className="visits-map-popup">
                <PopupContent point={point} />
              </Popup>
            </Marker>
          ))}
          <LocationButton />
        </MapContainer>
      </div>
    </div>
  );
}

/** Memoized so parent re-renders (e.g. timer) don't cause map to re-render when visits reference is stable. */
export const VisitsMap = memo(VisitsMapInner);
