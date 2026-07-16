'use client';

import {
  useMemo,
  useEffect,
  useRef,
  useState,
  memo,
  useCallback,
} from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  ScaleControl,
  Tooltip,
  useMap,
} from 'react-leaflet';
import { LeafletMapControls } from '@/lib/leaflet/map-plugin-controls';
import { ThemedBasemapLayer } from '@/lib/leaflet/themed-basemap-layer';
import { SetupMapPanes } from '@/lib/leaflet/setup-map-panes';
import { MapMarkerSearchControl } from '@/lib/leaflet/map-marker-search-control';
import { InfluenceCirclesCanvasLayer } from '@/lib/leaflet/influence-circles-canvas-layer';
import { useViewportCircles, useViewportMarkers } from '@/lib/leaflet/use-map-viewport-markers';
import {
  createClusterMarkerIcon,
  getReportMarkerIcon,
} from '@/lib/leaflet/marker-icons';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { BranchListItem } from '@/api/types/branch';
import type { InfluenceCircle, MapMarkerBase } from '@/api/types/map';
import type {
  BranchCatchmentOpportunity,
  GreenfieldOpportunityZone,
  SiteOpportunityZone,
} from '@/api/types/site-opportunity';
import { cn } from '@/lib/utils';
import { MapMarkerDetailPopup } from './map-marker-detail-popup';
import { SiteOpportunityMapOverlays } from './site-opportunity-map-overlays';
import {
  MapMarkerLegend,
  DEFAULT_OVERLAY_TOGGLES,
  type MapOverlayToggles,
} from './map-marker-legend';
import { markerTypeLabel } from './map-report-constants';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import '@/lib/leaflet/marker-styles.css';

const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473];
const DEFAULT_ZOOM = 10;
const FLY_BOUNDS_DURATION_S = 0.6;

const CLUSTER_MARKER_TYPES = new Set(['client', 'competitor', 'branch']);

function markerPosition(marker: MapMarkerBase): [number, number] | null {
  const lat = Number(marker.latitude);
  const lng = Number(marker.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
}

function filterMarkersByOverlayToggles(
  markers: MapMarkerBase[],
  toggles: MapOverlayToggles
): MapMarkerBase[] {
  return markers.filter((m) => {
    const mt = String(m.markerType ?? '');
    if (mt === 'client' && !toggles.showClients) return false;
    if (mt === 'competitor' && !toggles.showCompetitors) return false;
    if (mt === 'branch' && !toggles.showBranches) return false;
    if (mt === 'org' && !toggles.showOrg) return false;
    return true;
  });
}

function FitReportBounds({
  markers,
  fitBoundsKey,
}: {
  markers: MapMarkerBase[];
  /** Changes when country/province filters change — not on every marker refetch. */
  fitBoundsKey: string;
}) {
  const map = useMap();
  const lastFittedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!fitBoundsKey || markers.length === 0) return;
    if (lastFittedKeyRef.current === fitBoundsKey) return;
    lastFittedKeyRef.current = fitBoundsKey;

    const latLngs: L.LatLngExpression[] = [];
    for (const m of markers) {
      if (m.latitude != null && m.longitude != null) {
        latLngs.push([m.latitude, m.longitude]);
      }
    }
    if (latLngs.length === 0) return;
    if (latLngs.length === 1) {
      map.flyTo(latLngs[0], DEFAULT_ZOOM, { duration: FLY_BOUNDS_DURATION_S });
      return;
    }
    const b = L.latLngBounds(latLngs);
    map.flyToBounds(b, {
      padding: [48, 48],
      maxZoom: 14,
      duration: FLY_BOUNDS_DURATION_S,
    });
  }, [map, fitBoundsKey, markers]);

  return null;
}

const ReportMapMarker = memo(function ReportMapMarker({
  marker,
  onSelectMarker,
  onDeselectMarker,
  isSelected,
  markerRefs,
}: {
  marker: MapMarkerBase;
  onSelectMarker: (marker: MapMarkerBase) => void;
  onDeselectMarker: () => void;
  isSelected: boolean;
  markerRefs: React.MutableRefObject<Map<string, L.Marker>>;
}) {
  const position = markerPosition(marker);
  const markerId = String(marker.id);
  const mt = String(marker.markerType ?? 'unknown');

  useEffect(() => {
    if (!isSelected) return;
    const ref = markerRefs.current.get(markerId);
    const id = window.setTimeout(() => ref?.openPopup(), 0);
    return () => window.clearTimeout(id);
  }, [isSelected, markerId, markerRefs]);

  if (!position) return null;

  return (
    <Marker
      ref={(instance) => {
        if (instance) markerRefs.current.set(markerId, instance);
        else markerRefs.current.delete(markerId);
      }}
      position={position}
      icon={getReportMarkerIcon(marker, { isSelected })}
      zIndexOffset={mt === 'org' ? 500 : undefined}
      eventHandlers={{
        click: () => onSelectMarker(marker),
      }}
    >
      <Tooltip
        direction="top"
        offset={[0, -18]}
        className="reports-viz-tooltip"
        opacity={1}
      >
        {String(marker.name ?? marker.id)} · {markerTypeLabel(mt)}
      </Tooltip>
      {isSelected ? (
        <Popup
          className="reports-viz-popup"
          autoPanPadding={[24, 24]}
          maxWidth={320}
          eventHandlers={{
            remove: () => onDeselectMarker(),
          }}
        >
          <MapMarkerDetailPopup marker={marker} />
        </Popup>
      ) : null}
    </Marker>
  );
});

function InfluenceCirclesLayer({ circles }: { circles: InfluenceCircle[] }) {
  const visibleCircles = useViewportCircles(circles);
  return <InfluenceCirclesCanvasLayer circles={visibleCircles} />;
}

function MapMarkerLayers({
  allMarkers,
  selectedMarkerId,
  onSelectMarker,
  onDeselectMarker,
  markerRefs,
}: {
  allMarkers: MapMarkerBase[];
  selectedMarkerId: string | null;
  onSelectMarker: (marker: MapMarkerBase) => void;
  onDeselectMarker: () => void;
  markerRefs: React.MutableRefObject<Map<string, L.Marker>>;
}) {
  const visibleMarkers = useViewportMarkers(allMarkers);

  const { clusterMarkers, otherMarkers } = useMemo(() => {
    const cluster: MapMarkerBase[] = [];
    const other: MapMarkerBase[] = [];
    for (const m of visibleMarkers) {
      const mt = String(m.markerType ?? '');
      if (CLUSTER_MARKER_TYPES.has(mt)) cluster.push(m);
      else other.push(m);
    }
    return { clusterMarkers: cluster, otherMarkers: other };
  }, [visibleMarkers]);

  const handleSelect = useCallback(
    (marker: MapMarkerBase) => {
      onSelectMarker(marker);
    },
    [onSelectMarker]
  );

  return (
    <>
      {clusterMarkers.length > 0 ? (
        <MarkerClusterGroup
          chunkedLoading
          chunkInterval={200}
          maxClusterRadius={60}
          disableClusteringAtZoom={15}
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
              isSelected={selectedMarkerId === String(m.id)}
              onSelectMarker={handleSelect}
              onDeselectMarker={onDeselectMarker}
              markerRefs={markerRefs}
            />
          ))}
        </MarkerClusterGroup>
      ) : null}
      {otherMarkers.map((m, idx) => (
        <ReportMapMarker
          key={`other-${String(m.id)}-${idx}`}
          marker={m}
          isSelected={selectedMarkerId === String(m.id)}
          onSelectMarker={handleSelect}
          onDeselectMarker={onDeselectMarker}
          markerRefs={markerRefs}
        />
      ))}
    </>
  );
}

export interface ReportsVisualiserMapProps {
  allMarkers: MapMarkerBase[];
  influenceCircles: InfluenceCircle[];
  /** Country + province filter key — triggers bounds fit when changed. */
  fitBoundsKey?: string;
  className?: string;
  mapLayerBusy?: boolean;
  showOpportunities?: boolean;
  opportunityCatchments?: BranchCatchmentOpportunity[];
  opportunityGreenfield?: GreenfieldOpportunityZone[];
  selectedOpportunityId?: string | null;
  opportunitySelectionSeq?: number;
  onSelectOpportunity?: (zone: SiteOpportunityZone) => void;
  onSuggestedAreas?: () => void;
  branchMarkers?: MapMarkerBase[];
  branches?: BranchListItem[];
  orgLogoUrl?: string | null;
}

function ReportsVisualiserMapInner({
  allMarkers,
  influenceCircles,
  fitBoundsKey = '',
  className,
  mapLayerBusy = false,
  showOpportunities = false,
  opportunityCatchments = [],
  opportunityGreenfield = [],
  selectedOpportunityId = null,
  opportunitySelectionSeq = 0,
  onSelectOpportunity,
  onSuggestedAreas,
  branchMarkers = [],
  branches = [],
  orgLogoUrl,
}: ReportsVisualiserMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerBase | null>(null);
  const [overlays, setOverlays] = useState<MapOverlayToggles>(DEFAULT_OVERLAY_TOGGLES);
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    setOverlays((prev) => ({
      ...prev,
      showSuggestedAreas: showOpportunities,
    }));
  }, [showOpportunities]);

  const handleSelectMarker = useCallback((marker: MapMarkerBase) => {
    setSelectedMarker((prev) =>
      prev && String(prev.id) === String(marker.id) ? null : marker
    );
  }, []);

  const handleDeselectMarker = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  const handleOverlayChange = useCallback((patch: Partial<MapOverlayToggles>) => {
    setOverlays((prev) => ({ ...prev, ...patch }));
  }, []);

  const filteredByToggles = useMemo(
    () => filterMarkersByOverlayToggles(allMarkers, overlays),
    [allMarkers, overlays]
  );

  const filteredCircles = useMemo(() => {
    return influenceCircles.filter((c) => {
      const k = String(c.kind ?? c.markerType ?? '');
      if (k === 'client' && !overlays.showClients) return false;
      if (k === 'competitor' && !overlays.showCompetitors) return false;
      if (k === 'branch' && !overlays.showBranches) return false;
      if ((k === 'org' || k === 'organisation' || k === 'organization') && !overlays.showOrg)
        return false;
      return true;
    });
  }, [influenceCircles, overlays]);

  const selectedMarkerId = selectedMarker ? String(selectedMarker.id) : null;

  const center = useMemo((): [number, number] => {
    if (allMarkers.length === 0 && influenceCircles.length === 0) return DEFAULT_CENTER;
    const first =
      allMarkers.find((m) => m.latitude != null && m.longitude != null) ?? null;
    if (first) return [Number(first.latitude), Number(first.longitude)];
    const c0 = influenceCircles[0];
    if (c0) return [c0.latitude, c0.longitude];
    return DEFAULT_CENTER;
  }, [allMarkers, influenceCircles]);

  const isEmpty = filteredByToggles.length === 0;

  return (
    <div className={cn('flex flex-col min-h-0 h-full', className)}>
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
        {isEmpty && !mapLayerBusy ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1500] flex items-center justify-center bg-background/40 backdrop-blur-[1px]"
            role="status"
          >
            <p className="rounded-md border border-border bg-background/95 px-4 py-3 text-center text-sm text-muted-foreground shadow-sm">
              No markers in this region. Try another province or run Re-geocode map.
            </p>
          </div>
        ) : null}
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          scrollWheelZoom={false}
          gestureHandling
          preferCanvas
          zoomControl
        >
          <ThemedBasemapLayer />
          <SetupMapPanes />
          <ScaleControl position="bottomleft" imperial={false} />
          <LeafletMapControls />
          <MapMarkerSearchControl
            markers={filteredByToggles}
            onSelectMarker={(marker) => setSelectedMarker(marker)}
          />
          <FitReportBounds
            markers={filteredByToggles}
            fitBoundsKey={fitBoundsKey}
          />
          {overlays.showInfluenceCircles ? (
            <InfluenceCirclesLayer circles={filteredCircles} />
          ) : null}
          {overlays.showSuggestedAreas && showOpportunities ? (
            <SiteOpportunityMapOverlays
              catchments={opportunityCatchments}
              greenfield={opportunityGreenfield}
              selectedZoneId={selectedOpportunityId}
              selectionSeq={opportunitySelectionSeq}
              onSelectZone={(z) => onSelectOpportunity?.(z)}
              branchMarkers={branchMarkers}
              branches={branches}
              orgLogoUrl={orgLogoUrl}
            />
          ) : null}
          <MapMarkerLayers
            allMarkers={filteredByToggles}
            selectedMarkerId={selectedMarkerId}
            onSelectMarker={handleSelectMarker}
            onDeselectMarker={handleDeselectMarker}
            markerRefs={markerRefs}
          />
        </MapContainer>
        <MapMarkerLegend
          markers={allMarkers}
          overlays={overlays}
          onOverlayChange={handleOverlayChange}
          onSuggestedAreas={onSuggestedAreas}
        />
      </div>
    </div>
  );
}

export const ReportsVisualiserMap = memo(ReportsVisualiserMapInner);
