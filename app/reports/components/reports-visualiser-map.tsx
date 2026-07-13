'use client';

import {
  useMemo,
  useEffect,
  useRef,
  useState,
  memo,
  createElement,
  useCallback,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  MapContainer,
  Marker,
  Popup,
  Circle,
  ScaleControl,
  useMap,
} from 'react-leaflet';
import { LeafletMapControls } from '@/lib/leaflet/map-plugin-controls';
import {
  INFLUENCE_CIRCLES_MIN_ZOOM,
  useMapZoom,
} from '@/lib/leaflet/use-map-zoom';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { divIcon } from 'leaflet';
import L from 'leaflet';
import type { InfluenceCircle, MapMarkerBase } from '@/api/types/map';
import type {
  BranchCatchmentOpportunity,
  GreenfieldOpportunityZone,
  SiteOpportunityZone,
} from '@/api/types/site-opportunity';
import { cn } from '@/lib/utils';
import { MapMarkerDetailPopup } from './map-marker-detail-popup';
import { SiteOpportunityMapOverlays } from './site-opportunity-map-overlays';
import { Layers, type LucideIcon } from 'lucide-react';
import {
  CLUSTER_MARKER_BG,
  MAP_ENTITY_MARKER_SIZE,
  MAP_ENTITY_MARKERS,
  MARKER_COLORS,
  influenceColorForKind,
  resolveCompetitorMarkerColor,
  type MapEntityMarkerType,
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
    color: var(--foreground);
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

  .leaflet-popup-content,
  .leaflet-popup-content-wrapper,
  .site-opp-rank-marker {
    font-family: var(--font-urbanist, Urbanist), ui-sans-serif, system-ui, sans-serif;
  }

  .reports-viz-search-hidden.leaflet-div-icon {
    border: none !important;
    background: transparent !important;
  }

  .reports-viz-easybtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
  }

  .leaflet-container .easy-button-button {
    background: hsl(var(--background));
    border-color: hsl(var(--border));
    color: hsl(var(--foreground));
  }

  .leaflet-container .easy-button-button:hover {
    background: hsl(var(--muted));
  }

  .marker-cluster-small,
  .marker-cluster-medium,
  .marker-cluster-large {
    background: transparent !important;
  }

  .reports-viz-cluster-marker.leaflet-div-icon {
    border: none !important;
    background: transparent !important;
  }
`;

const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473];
const DEFAULT_ZOOM = 10;
const MARKER_SIZE = 36;
const MARKER_ANCHOR = MARKER_SIZE / 2;

const iconCache = new Map<string, ReturnType<typeof divIcon>>();
const lucideCircleIconCache = new Map<string, ReturnType<typeof divIcon>>();
const logoCircleIconCache = new Map<string, ReturnType<typeof divIcon>>();
const clusterIconCache = new Map<number, ReturnType<typeof divIcon>>();

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

function resolveCompetitorLogoUrl(marker: MapMarkerBase): string | undefined {
  const raw =
    marker.logoUrl?.trim() ||
    (typeof marker.logo === 'string' ? marker.logo.trim() : undefined);
  return raw || undefined;
}

function resolveBranchOrOrgLogoUrl(marker: MapMarkerBase): string | undefined {
  const raw =
    marker.logoUrl?.trim() ||
    (typeof marker.logo === 'string' ? marker.logo.trim() : undefined);
  return raw || undefined;
}

function resolveMarkerImageUrl(marker: MapMarkerBase): string | undefined {
  const mt = String(marker.markerType ?? '');
  if (mt === 'competitor') {
    return resolveCompetitorLogoUrl(marker);
  }
  if (mt === 'branch' || mt === 'org') {
    return resolveBranchOrOrgLogoUrl(marker);
  }
  if (
    ['check-in', 'shift-start', 'shift-end', 'break-start', 'break-end', 'claim'].includes(mt)
  ) {
    const img = marker.image as string | undefined;
    const owner = marker.owner as { photoURL?: string; avatar?: string } | undefined;
    return img || owner?.photoURL || owner?.avatar;
  }
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
    quotation: 'Q',
    task: 'T',
    journal: 'J',
    'check-in-visit': 'V',
    lead: 'L',
    claim: 'K',
  };
  return m[markerType] ?? markerType.slice(0, 1).toUpperCase();
}

function createLucideCircleMarkerIcon(
  bg: string,
  Icon: LucideIcon,
  cacheKey: string,
  size = MAP_ENTITY_MARKER_SIZE
): ReturnType<typeof divIcon> {
  const cached = lucideCircleIconCache.get(cacheKey);
  if (cached) return cached;

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
  lucideCircleIconCache.set(cacheKey, icon);
  return icon;
}

function createLogoCircleMarkerIcon(
  logoUrl: string,
  ringColor: string,
  cacheKey: string,
  size = MAP_ENTITY_MARKER_SIZE
): ReturnType<typeof divIcon> {
  const cached = logoCircleIconCache.get(cacheKey);
  if (cached) return cached;

  const ringWidth = 3;
  const html = renderToStaticMarkup(
    createElement(
      'div',
      {
        style: {
          width: size,
          height: size,
          borderRadius: '50%',
          border: `${ringWidth}px solid ${ringColor}`,
          boxShadow: '0 2px 6px rgba(0,0,0,0.28)',
          overflow: 'hidden',
          background: '#fff',
          boxSizing: 'border-box',
        },
      },
      createElement('img', {
        src: logoUrl,
        alt: '',
        referrerPolicy: 'no-referrer',
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius: '50%',
          display: 'block',
        },
      })
    )
  );
  const icon = divIcon({
    html,
    className: 'reports-viz-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  logoCircleIconCache.set(cacheKey, icon);
  return icon;
}

function createClusterMarkerIcon(count: number): ReturnType<typeof divIcon> {
  const cached = clusterIconCache.get(count);
  if (cached) return cached;

  const size = count < 10 ? 36 : count < 100 ? 44 : 52;
  const html = renderToStaticMarkup(
    createElement(
      'div',
      {
        style: {
          backgroundColor: CLUSTER_MARKER_BG,
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.32)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        },
      },
      createElement(Layers, {
        size: 14,
        color: 'white',
        strokeWidth: 2.5,
      }),
      createElement(
        'span',
        {
          style: {
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
          },
        },
        String(count)
      )
    )
  );
  const icon = divIcon({
    html,
    className: 'reports-viz-cluster-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  clusterIconCache.set(count, icon);
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
        objectFit: 'contain',
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
          fontSize: mt === 'quotation' ? 13 : 11,
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

  if (mt === 'competitor') {
    const logoUrl = resolveCompetitorLogoUrl(marker);
    const resolvedBg = resolveCompetitorMarkerColor(marker);
    if (logoUrl) {
      return createLogoCircleMarkerIcon(
        logoUrl,
        resolvedBg,
        `competitor-logo:${marker.id}:${logoUrl}:${resolvedBg}`
      );
    }
    const { Icon } = MAP_ENTITY_MARKERS.competitor;
    return createLucideCircleMarkerIcon(
      resolvedBg,
      Icon,
      `competitor:${resolvedBg}`
    );
  }

  if (mt === 'client' || mt === 'branch' || mt === 'org') {
    const entityType = mt as MapEntityMarkerType;
    const { Icon, bg } = MAP_ENTITY_MARKERS[entityType];
    if (mt === 'branch' || mt === 'org') {
      const logoUrl = resolveBranchOrOrgLogoUrl(marker);
      if (logoUrl) {
        return createLogoCircleMarkerIcon(
          logoUrl,
          bg,
          `${entityType}-logo:${marker.id}:${logoUrl}:${bg}`
        );
      }
    }
    return createLucideCircleMarkerIcon(bg, Icon, `${entityType}:${bg}`);
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

function circlePathOptions(kind: string, markerColor?: unknown) {
  const fill =
    typeof markerColor === 'string' && markerColor.trim()
      ? markerColor.trim()
      : influenceColorForKind(kind);
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
}: {
  markers: MapMarkerBase[];
}) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  const boundsKey = useMemo(() => {
    const pts: string[] = [];
    for (const m of markers) {
      if (m.latitude != null && m.longitude != null) {
        pts.push(`${m.latitude.toFixed(5)},${m.longitude.toFixed(5)}`);
      }
    }
    pts.sort();
    return pts.join('|');
  }, [markers]);

  useEffect(() => {
    if (hasFittedRef.current || !boundsKey) return;
    hasFittedRef.current = true;

    const latLngs: L.LatLngExpression[] = [];
    for (const m of markers) {
      if (m.latitude != null && m.longitude != null) {
        latLngs.push([m.latitude, m.longitude]);
      }
    }
    if (latLngs.length === 0) return;
    if (latLngs.length === 1) {
      map.setView(latLngs[0], DEFAULT_ZOOM);
      return;
    }
    const b = L.latLngBounds(latLngs);
    map.fitBounds(b, { padding: [32, 32], maxZoom: 14, animate: false });
  }, [map, boundsKey, markers]);

  return null;
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
  const markerRef = useRef<L.Marker | null>(null);
  const position = selectedMarker ? markerPosition(selectedMarker) : null;

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

const ReportMapMarker = memo(function ReportMapMarker({
  marker,
  onSelectMarker,
}: {
  marker: MapMarkerBase;
  onSelectMarker: (marker: MapMarkerBase) => void;
}) {
  const position = markerPosition(marker);
  if (!position) return null;
  return (
    <Marker
      position={position}
      icon={getMarkerIcon(marker)}
      eventHandlers={{
        click: () => onSelectMarker(marker),
      }}
    />
  );
});

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

  return (
    <>
      {clusterMarkers.length > 0 ? (
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={70}
          disableClusteringAtZoom={16}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          iconCreateFunction={(cluster) =>
            createClusterMarkerIcon(cluster.getChildCount())
          }
        >
          {clusterMarkers.map((m, idx) => (
            <ReportMapMarker
              key={`cluster-${String(m.id)}-${idx}`}
              marker={m}
              onSelectMarker={onSelectMarker}
            />
          ))}
        </MarkerClusterGroup>
      ) : null}
      {otherMarkers.map((m, idx) => (
        <ReportMapMarker
          key={`other-${String(m.id)}-${idx}`}
          marker={m}
          onSelectMarker={onSelectMarker}
        />
      ))}
    </>
  );
}

function InfluenceCirclesLayer({
  influenceCircles,
}: {
  influenceCircles: InfluenceCircle[];
}) {
  const zoom = useMapZoom();
  if (zoom < INFLUENCE_CIRCLES_MIN_ZOOM) return null;

  return (
    <>
      {influenceCircles.map((c) => {
        const k = String(c.kind ?? c.markerType ?? 'client');
        return (
          <Circle
            key={c.id}
            center={[c.latitude, c.longitude]}
            radius={c.radiusMeters}
            pathOptions={circlePathOptions(k, c.markerColor)}
          />
        );
      })}
    </>
  );
}

function MapZoomBoundsSync({
  markers,
}: {
  markers: MapMarkerBase[];
}) {
  return <FitReportBounds markers={markers} />;
}

export interface ReportsVisualiserMapProps {
  allMarkers: MapMarkerBase[];
  influenceCircles: InfluenceCircle[];
  className?: string;
  /** Non-blocking banner while /reports/map is loading or refetching */
  mapLayerBusy?: boolean;
  showOpportunities?: boolean;
  opportunityCatchments?: BranchCatchmentOpportunity[];
  opportunityGreenfield?: GreenfieldOpportunityZone[];
  selectedOpportunityId?: string | null;
  opportunitySelectionSeq?: number;
  onSelectOpportunity?: (zone: SiteOpportunityZone) => void;
  /** Map ★ control — toggles suggested areas (same as toolbar). */
  onSuggestedAreas?: () => void;
}

function ReportsVisualiserMapInner({
  allMarkers,
  influenceCircles,
  className,
  mapLayerBusy = false,
  showOpportunities = false,
  opportunityCatchments = [],
  opportunityGreenfield = [],
  selectedOpportunityId = null,
  opportunitySelectionSeq = 0,
  onSelectOpportunity,
  onSuggestedAreas,
}: ReportsVisualiserMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerBase | null>(null);
  const handleSelectMarker = useCallback((marker: MapMarkerBase) => {
    setSelectedMarker(marker);
  }, []);

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
    <div className={cn('flex flex-col min-h-0 h-full', className)}>
      <style dangerouslySetInnerHTML={{ __html: customMarkerStyles }} />
      <div className="flex-1 min-h-0 h-full rounded border overflow-hidden bg-muted/30 relative">
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
          scrollWheelZoom={false}
          gestureHandling
          preferCanvas
        >
          <ScaleControl position="bottomright" imperial={false} />
          <LeafletMapControls
            markers={allMarkers}
            onSelectMarker={handleSelectMarker}
            onSuggestedAreas={onSuggestedAreas}
            showOpportunities={showOpportunities}
          />
          <MapZoomBoundsSync markers={allMarkers} />
          <InfluenceCirclesLayer influenceCircles={influenceCircles} />
          {showOpportunities ? (
            <SiteOpportunityMapOverlays
              catchments={opportunityCatchments}
              greenfield={opportunityGreenfield}
              selectedZoneId={selectedOpportunityId}
              selectionSeq={opportunitySelectionSeq}
              onSelectZone={(z) => onSelectOpportunity?.(z)}
            />
          ) : null}
          <MapMarkerLayers
            allMarkers={allMarkers}
            onSelectMarker={handleSelectMarker}
          />
          <SelectedMarkerPopup
            selectedMarker={visibleSelectedMarker}
            onClose={() => setSelectedMarker(null)}
          />
        </MapContainer>
      </div>
    </div>
  );
}

export const ReportsVisualiserMap = memo(ReportsVisualiserMapInner);
