'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Map,
  MapControls,
  MapMarker,
  MapPopup,
  MarkerContent,
  MarkerLabel,
  useMap,
} from '@/components/ui/map';
import { LoadingSpinner } from '@/components/loading-spinner';
import { MapLayerToggles } from '@/app/visualiser/components/map-layer-toggles';
import { MapFeaturePopupContent } from '@/app/visualiser/components/map-feature-popup';
import { LayeredLogoClusters } from '@/app/visualiser/components/logo-cluster-layer';
import { SimulationOverlayLayer } from '@/app/visualiser/components/simulation-overlay-layer';
import { useVisualiserSimulation } from '@/app/visualiser/simulation-context';
import {
  DEFAULT_LAYER_VISIBILITY,
  useVisualiserMapLayers,
  type VisualiserLayerVisibility,
} from '@/app/visualiser/hooks/use-visualiser-map-layers';
import {
  LAYER_META,
  type VisualiserLayerId,
  type VisualiserMapPoint,
} from '@/lib/utils/visualiser-map-points';
import { formatZarShort } from '@/lib/site-opportunity/format-potential';
import {
  buildTurnoverSimulation,
  branchSimulationTextClass,
} from '@/lib/site-opportunity/turnover-simulation';

/** Johannesburg fallback — MapLibre uses [lng, lat]. */
const FALLBACK_CENTER: [number, number] = [28.0473, -26.2041];
const DEFAULT_ZOOM = 11;

function FlyToPoint({ point }: { point: VisualiserMapPoint | null }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || !point) return;
    map.flyTo({
      center: [point.longitude, point.latitude],
      zoom: Math.max(map.getZoom(), 14),
      duration: 800,
      essential: true,
    });
  }, [map, isLoaded, point]);

  return null;
}

function FlyToSimulationZone({
  lat,
  lng,
  zoneId,
}: {
  lat: number;
  lng: number;
  zoneId: string | null;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || !zoneId) return;
    map.flyTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 12),
      duration: 700,
      essential: true,
    });
  }, [map, isLoaded, zoneId, lat, lng]);

  return null;
}

interface OverviewMapProps {
  orgRef?: string | null;
  enabled?: boolean;
}

/**
 * Competitor Overview map: layered branches/HQ, clients, competitors, sales-rep GPS.
 * After Simulate, shows 5 km catchment overlays and selected-zone summary.
 */
export function OverviewMap({ orgRef, enabled = true }: OverviewMapProps) {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [isUserLocation, setIsUserLocation] = useState(false);
  const [visibility, setVisibility] =
    useState<VisualiserLayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [selected, setSelected] = useState<VisualiserMapPoint | null>(null);

  const { isActive, selectedZone, clearSimulation, panelOpen } =
    useVisualiserSimulation();

  const { visiblePoints, counts, isLoading } = useVisualiserMapLayers({
    enabled,
    orgRef,
    visibility,
  });

  const zoneSim = useMemo(() => {
    if (!selectedZone) return null;
    return buildTurnoverSimulation(selectedZone, {
      actualRevenueZAR:
        selectedZone.kind === 'catchment'
          ? selectedZone.actualRevenueZAR
          : null,
    });
  }, [selectedZone]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setCenter(FALLBACK_CENTER);
      setIsUserLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter([position.coords.longitude, position.coords.latitude]);
        setIsUserLocation(true);
      },
      () => {
        setCenter(FALLBACK_CENTER);
        setIsUserLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }, []);

  useEffect(() => {
    if (isUserLocation || !visiblePoints.length || !center) return;
    const onFallback =
      Math.abs(center[0] - FALLBACK_CENTER[0]) < 1e-6 &&
      Math.abs(center[1] - FALLBACK_CENTER[1]) < 1e-6;
    if (!onFallback) return;
    const first = visiblePoints[0];
    setCenter([first.longitude, first.latitude]);
  }, [isUserLocation, visiblePoints, center]);

  const pointsByLayer = useMemo(() => {
    const grouped: Partial<Record<VisualiserLayerId, VisualiserMapPoint[]>> = {};
    for (const p of visiblePoints) {
      (grouped[p.layer] ??= []).push(p);
    }
    return grouped;
  }, [visiblePoints]);

  const handleLayerChange = useCallback(
    (layer: VisualiserLayerId, visible: boolean) => {
      setVisibility((prev) => ({ ...prev, [layer]: visible }));
      setSelected((cur) => (cur?.layer === layer && !visible ? null : cur));
    },
    []
  );

  if (!center) {
    return <LoadingSpinner wrapperClassName="h-full min-h-[240px]" />;
  }

  const [longitude, latitude] = center;

  return (
    <div className="visualiser-map relative h-full min-h-0 flex-1 overflow-hidden">
      {isLoading ? (
        <div className="bg-background/60 absolute inset-0 z-20 flex items-center justify-center backdrop-blur-[1px]">
          <LoadingSpinner wrapperClassName="py-8" />
        </div>
      ) : null}

      {isActive && selectedZone && zoneSim && !panelOpen ? (
        <div className="bg-background/95 absolute top-3 left-3 z-10 max-w-xs rounded-md border px-3 py-2 text-xs shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`truncate font-medium ${branchSimulationTextClass(zoneSim)}`}>
                {selectedZone.kind === 'catchment'
                  ? selectedZone.branchName
                  : selectedZone.label}
              </p>
              <p className="text-muted-foreground mt-0.5">
                Pool {formatZarShort(selectedZone.addressablePoolZAR)} · Potential{' '}
                {formatZarShort(selectedZone.potentialLowZAR)}–
                {formatZarShort(selectedZone.potentialHighZAR)}
              </p>
              <p className="text-muted-foreground">
                Model {formatZarShort(zoneSim.simulatedMonthlyZAR)}
                {zoneSim.actualMonthlyZAR != null
                  ? ` · Actual ${formatZarShort(zoneSim.actualMonthlyZAR)}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground shrink-0 text-[10px] underline"
              onClick={() => clearSimulation()}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <MapLayerToggles
        visibility={visibility}
        counts={counts}
        onChange={handleLayerChange}
        className={
          isActive && selectedZone && !panelOpen ? 'top-28' : undefined
        }
      />

      <Map center={center} zoom={DEFAULT_ZOOM}>
        <MapControls
          position="bottom-right"
          showZoom
          showCompass
          showLocate
          showFullscreen
        />
        <FlyToPoint point={selected} />
        {selectedZone ? (
          <FlyToSimulationZone
            lat={selectedZone.lat}
            lng={selectedZone.lng}
            zoneId={selectedZone.id}
          />
        ) : null}

        <SimulationOverlayLayer />

        <LayeredLogoClusters
          pointsByLayer={pointsByLayer}
          onPointClick={(point) => setSelected(point)}
        />

        {isUserLocation ? (
          <MapMarker longitude={longitude} latitude={latitude}>
            <MarkerContent>
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-60" />
                <span className="relative size-3 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
              </span>
              <MarkerLabel position="top">You</MarkerLabel>
            </MarkerContent>
          </MapMarker>
        ) : null}

        {selected ? (
          <MapPopup
            key={selected.id}
            longitude={selected.longitude}
            latitude={selected.latitude}
            offset={28}
            closeButton
            closeOnClick={false}
            focusAfterOpen={false}
            onClose={() => setSelected(null)}
            className="min-w-56 border-border/50 bg-background/75 font-sans shadow-none backdrop-blur-md"
          >
            <MapFeaturePopupContent point={selected} />
          </MapPopup>
        ) : null}
      </Map>

      <div className="bg-background/90 text-muted-foreground absolute right-3 bottom-3 z-10 hidden rounded-md border px-2 py-1 text-[10px] backdrop-blur sm:block">
        {visiblePoints.length} mapped ·{' '}
        {isActive ? 'simulation on · ' : ''}
        {Object.entries(LAYER_META)
          .filter(([id]) => visibility[id as VisualiserLayerId])
          .map(([id, meta]) => `${meta.label} ${counts[id as VisualiserLayerId]}`)
          .join(' · ')}
      </div>
    </div>
  );
}
