'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mountain, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Map,
  MapControls,
  MapMarker,
  MapPopup,
  MarkerContent,
  MarkerLabel,
  useMap,
} from '@/components/ui/map';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { MapLayerToggles } from '@/app/visualiser/components/map-layer-toggles';
import { MapFeaturePopupContent } from '@/app/visualiser/components/map-feature-popup';
import { JourneyPointsLayer } from '@/app/visualiser/components/journey-points-layer';
import { LayeredLogoClusters } from '@/app/visualiser/components/logo-cluster-layer';
import { SimulationOverlayLayer } from '@/app/visualiser/components/simulation-overlay-layer';
import { RepTrackerControl } from '@/app/visualiser/components/rep-tracker-control';
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
import { useApiClient } from '@/api/hooks/use-api-client';
import { useBranches, useSearchableUsersList } from '@/api/hooks';
import { getRepJourney } from '@/api/endpoints/tracking';
import type {
  RepJourneyPoint,
  RepJourneyRange,
  RepJourneySummary,
} from '@/api/types/tracking';

/** Johannesburg fallback — MapLibre uses [lng, lat]. */
const FALLBACK_CENTER: [number, number] = [28.0473, -26.2041];
const DEFAULT_ZOOM = 11;

const RANGE_LABELS: Record<RepJourneyRange, string> = {
  hour: 'past hour',
  day: 'past day',
  week: 'past week',
};

type JourneyRouteState = {
  repUid: number;
  range: RepJourneyRange;
  repName: string;
  points: RepJourneyPoint[];
  summary: RepJourneySummary;
};

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

function FitJourneyBounds({
  coordinates,
  routeKey,
}: {
  coordinates: [number, number][];
  routeKey: string | null;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || !routeKey || coordinates.length === 0) return;

    if (coordinates.length === 1) {
      map.flyTo({
        center: coordinates[0],
        zoom: Math.max(map.getZoom(), 14),
        duration: 800,
        essential: true,
      });
      return;
    }

    let minLng = coordinates[0][0];
    let maxLng = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];
    for (const [lng, lat] of coordinates) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 64, maxZoom: 15, duration: 900 }
    );
  }, [map, isLoaded, routeKey, coordinates]);

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

/** Pitch / bearing controls — mapcn Advanced “Custom Controls” pattern. */
function Map3DController() {
  const { map, isLoaded } = useMap();
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleMove = () => {
      setPitch(Math.round(map.getPitch()));
      setBearing(Math.round(map.getBearing()));
    };

    handleMove();
    map.on('move', handleMove);
    return () => {
      map.off('move', handleMove);
    };
  }, [map, isLoaded]);

  const handle3DView = () => {
    map?.easeTo({
      pitch: 60,
      bearing: -20,
      duration: 1000,
    });
  };

  const handleReset = () => {
    map?.easeTo({
      pitch: 0,
      bearing: 0,
      duration: 1000,
    });
  };

  if (!isLoaded) return null;

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={handle3DView}>
          <Mountain className="mr-1.5 size-4" />
          3D View
        </Button>
        <Button size="sm" variant="secondary" onClick={handleReset}>
          <RotateCcw className="mr-1.5 size-4" />
          Reset
        </Button>
      </div>
      <div className="bg-background/90 rounded-md border px-3 py-2 font-mono text-xs backdrop-blur">
        <div>Pitch: {pitch}°</div>
        <div>Bearing: {bearing}°</div>
      </div>
    </div>
  );
}

function resolveRepDisplayName(
  repUid: number,
  selected: VisualiserMapPoint | null,
  users: { uid: number; name?: string | null; surname?: string | null; email?: string | null }[],
  override?: string
): string {
  if (override) return override;
  if (selected?.repUid === repUid && selected.name) return selected.name;
  const user = users.find((u) => u.uid === repUid);
  if (user) {
    const fromParts = [user.name, user.surname].filter(Boolean).join(' ').trim();
    if (fromParts) return fromParts;
    if (user.email) return user.email;
  }
  return `Rep #${repUid}`;
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
  const client = useApiClient();
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [isUserLocation, setIsUserLocation] = useState(false);
  const [visibility, setVisibility] =
    useState<VisualiserLayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [selected, setSelected] = useState<VisualiserMapPoint | null>(null);
  const [journeyRoute, setJourneyRoute] = useState<JourneyRouteState | null>(
    null
  );
  const [isTracing, setIsTracing] = useState(false);
  const [selectedJourneyPoint, setSelectedJourneyPoint] =
    useState<RepJourneyPoint | null>(null);
  const [trackedRepUid, setTrackedRepUid] = useState('all');
  const [activeTraceRange, setActiveTraceRange] =
    useState<RepJourneyRange | null>(null);
  const [trackStatusMessage, setTrackStatusMessage] = useState<string | null>(
    null
  );

  const {
    users,
    searchQuery: repSearchInput,
    setSearchQuery: setRepSearchInput,
    isSearchLoading: isRepSearchLoading,
    rememberUser,
    clearSelection: clearRepSelection,
  } = useSearchableUsersList({ enabled, limit: 100 });

  const { isActive, selectedZone, clearSimulation, panelOpen } =
    useVisualiserSimulation();

  const { data: branches = [] } = useBranches({ enabled });

  const { allPoints, visiblePoints, counts, isLoading } = useVisualiserMapLayers({
    enabled,
    orgRef,
    visibility,
  });

  /** Keep popup bound to refreshed point data after revenue edits / map-data refetch. */
  useEffect(() => {
    setSelected((prev) => {
      if (!prev) return prev;
      const next = visiblePoints.find((p) => p.id === prev.id);
      if (!next) return null;
      if (
        next.estimatedAnnualRevenue === prev.estimatedAnnualRevenue &&
        next.metricValue === prev.metricValue &&
        next.name === prev.name &&
        next.repUid === prev.repUid
      ) {
        return prev;
      }
      return next;
    });
  }, [visiblePoints]);

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

  const handleClearRoute = useCallback(() => {
    setJourneyRoute(null);
    setSelectedJourneyPoint(null);
    setActiveTraceRange(null);
    setTrackStatusMessage(null);
  }, []);

  const handleClearTracking = useCallback(() => {
    setTrackedRepUid('all');
    clearRepSelection();
    setRepSearchInput('');
    handleClearRoute();
    setSelected((cur) => (cur?.layer === 'reps' ? null : cur));
  }, [clearRepSelection, handleClearRoute, setRepSearchInput]);

  const handleLayerChange = useCallback(
    (layer: VisualiserLayerId, visible: boolean) => {
      setVisibility((prev) => ({ ...prev, [layer]: visible }));
      setSelected((cur) => (cur?.layer === layer && !visible ? null : cur));
      if (layer === 'reps' && !visible) {
        setJourneyRoute(null);
        setSelectedJourneyPoint(null);
        setTrackedRepUid('all');
        clearRepSelection();
        setRepSearchInput('');
        setActiveTraceRange(null);
        setTrackStatusMessage(null);
      }
    },
    [clearRepSelection, setRepSearchInput]
  );

  const handleTraceRoute = useCallback(
    async (
      repUid: number,
      range: RepJourneyRange,
      repNameOverride?: string,
      options?: { quiet?: boolean }
    ): Promise<boolean> => {
      const quiet = options?.quiet === true;
      const repName = resolveRepDisplayName(
        repUid,
        selected,
        users,
        repNameOverride
      );
      setIsTracing(true);
      setSelectedJourneyPoint(null);
      setActiveTraceRange(range);
      setTrackStatusMessage(null);
      const toastId = 'rep-journey-trace';
      toast.loading(`Loading ${RANGE_LABELS[range]} points…`, { id: toastId });
      try {
        const response = await getRepJourney(client, repUid, range);
        const data = response.data;
        if (!data || data.points.length < 1) {
          setJourneyRoute(null);
          setTrackStatusMessage(
            `No GPS points for ${repName} in the ${RANGE_LABELS[range]}.`
          );
          if (!quiet) {
            toast.error(
              `No GPS points for ${repName} in the ${RANGE_LABELS[range]}.`,
              { id: toastId }
            );
          }
          return false;
        }

        setJourneyRoute({
          repUid,
          range,
          repName,
          points: data.points,
          summary: data.summary,
        });
        setTrackStatusMessage(
          `${data.summary.totalPoints} points · ${data.summary.totalDistanceKm.toFixed(1)} km · ${RANGE_LABELS[range]}`
        );
        toast.success(
          `${repName}: ${data.summary.totalPoints} points · ${data.summary.totalDistanceKm.toFixed(1)} km · ${RANGE_LABELS[range]}`,
          { id: toastId }
        );
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load journey';
        setJourneyRoute(null);
        setTrackStatusMessage(message);
        if (!quiet) {
          toast.error(message, { id: toastId });
        }
        return false;
      } finally {
        setIsTracing(false);
      }
    },
    [client, selected, users]
  );

  const handleTrackedRepChange = useCallback(
    async (uid: string) => {
      if (uid === 'all') {
        handleClearTracking();
        return;
      }

      setTrackedRepUid(uid);
      const repUid = Number(uid);
      if (!Number.isFinite(repUid)) return;

      const fromList = users.find((u) => u.uid === repUid);
      if (fromList) {
        rememberUser(fromList);
      }

      setVisibility((prev) =>
        prev.reps ? prev : { ...prev, reps: true }
      );
      setSelectedJourneyPoint(null);

      const pin = allPoints.find(
        (p) => p.layer === 'reps' && p.repUid === repUid
      );
      setSelected(pin ?? null);

      const repName = resolveRepDisplayName(repUid, pin ?? null, users);
      const dayLoaded = await handleTraceRoute(repUid, 'day', repName, {
        quiet: true,
      });
      if (!dayLoaded) {
        await handleTraceRoute(repUid, 'week', repName);
      }
    },
    [
      allPoints,
      handleClearTracking,
      handleTraceRoute,
      rememberUser,
      users,
    ]
  );

  const trackedUidNum =
    trackedRepUid === 'all' ? null : Number(trackedRepUid);

  const journeyCoordinates = useMemo(
    (): [number, number][] =>
      (journeyRoute?.points ?? []).map((p) => [p.longitude, p.latitude]),
    [journeyRoute]
  );

  const journeyRouteKey = journeyRoute
    ? `${journeyRoute.repUid}-${journeyRoute.range}-${journeyRoute.summary.totalPoints}`
    : null;

  const activeJourneySummary =
    journeyRoute &&
    (selected?.repUid === journeyRoute.repUid ||
      trackedUidNum === journeyRoute.repUid)
      ? journeyRoute.summary
      : null;

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

      <div
        className={`absolute left-3 z-10 flex w-[min(100%-1.5rem,16rem)] flex-col gap-2 ${
          isActive && selectedZone && !panelOpen ? 'top-28' : 'top-3'
        }`}
      >
        <MapLayerToggles
          visibility={visibility}
          counts={counts}
          onChange={handleLayerChange}
        />

        <RepTrackerControl
          users={users}
          branches={branches}
          selectedUid={trackedRepUid}
          onUidChange={(uid) => {
            void handleTrackedRepChange(uid);
          }}
          activeRange={activeTraceRange}
          isTracing={isTracing}
          statusMessage={trackStatusMessage}
          onClear={handleClearTracking}
          searchQuery={repSearchInput}
          onSearchQueryChange={setRepSearchInput}
          isSearchLoading={isRepSearchLoading}
          onTraceRange={(range) => {
            if (trackedUidNum == null) return;
            void handleTraceRoute(trackedUidNum, range);
          }}
        />
      </div>

      {journeyRoute ? (
        <div className="bg-background/95 absolute bottom-3 left-3 z-10 max-w-xs rounded-md border px-3 py-2 text-xs shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{journeyRoute.repName}</p>
              <p className="text-muted-foreground mt-0.5">
                {RANGE_LABELS[journeyRoute.range]} ·{' '}
                {journeyRoute.summary.totalPoints} points ·{' '}
                {journeyRoute.summary.totalDistanceKm.toFixed(1)} km
              </p>
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground shrink-0 text-[10px] underline"
              onClick={handleClearTracking}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <Map center={center} zoom={DEFAULT_ZOOM}>
        <MapControls
          position="bottom-right"
          showZoom
          showCompass
          showLocate
          showFullscreen
        />
        <Map3DController />
        <FlyToPoint point={selected} />
        <FitJourneyBounds
          coordinates={journeyCoordinates}
          routeKey={journeyRouteKey}
        />
        {selectedZone ? (
          <FlyToSimulationZone
            lat={selectedZone.lat}
            lng={selectedZone.lng}
            zoneId={selectedZone.id}
          />
        ) : null}

        <SimulationOverlayLayer />

        {journeyRoute && journeyRoute.points.length > 0 ? (
          <JourneyPointsLayer
            points={journeyRoute.points}
            onPointClick={(point) => setSelectedJourneyPoint(point)}
          />
        ) : null}

        <LayeredLogoClusters
          pointsByLayer={pointsByLayer}
          onPointClick={(point) => {
            setSelectedJourneyPoint(null);
            setSelected(point);
          }}
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

        {selectedJourneyPoint ? (
          <MapPopup
            key={`journey-${selectedJourneyPoint.latitude}-${selectedJourneyPoint.longitude}-${selectedJourneyPoint.recordedAt}`}
            longitude={selectedJourneyPoint.longitude}
            latitude={selectedJourneyPoint.latitude}
            offset={18}
            closeButton
            closeOnClick={false}
            focusAfterOpen={false}
            onClose={() => setSelectedJourneyPoint(null)}
            className="min-w-44 border-border/50 bg-background/75 font-sans shadow-none backdrop-blur-md"
          >
            <div className="space-y-1.5 pr-1 font-sans text-xs">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                {selectedJourneyPoint.isStop ? 'Stop' : 'Key point'}
              </p>
              {selectedJourneyPoint.isStop &&
              selectedJourneyPoint.stopDurationFormatted ? (
                <p className="text-foreground text-sm font-semibold">
                  Stopped {selectedJourneyPoint.stopDurationFormatted}
                </p>
              ) : null}
              {selectedJourneyPoint.address ? (
                <p className="text-muted-foreground break-words">
                  {selectedJourneyPoint.address}
                </p>
              ) : null}
              <p className="text-muted-foreground text-[11px]">
                {(() => {
                  try {
                    return new Date(
                      selectedJourneyPoint.recordedAt
                    ).toLocaleString();
                  } catch {
                    return selectedJourneyPoint.recordedAt;
                  }
                })()}
              </p>
            </div>
          </MapPopup>
        ) : null}

        {selected && !selectedJourneyPoint ? (
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
            <MapFeaturePopupContent
              point={selected}
              activeTraceRange={activeTraceRange}
              isTracing={isTracing}
              journeySummary={activeJourneySummary}
              onTraceRoute={(repUid, range) => {
                setTrackedRepUid(String(repUid));
                void handleTraceRoute(repUid, range);
              }}
              onClearRoute={handleClearTracking}
            />
          </MapPopup>
        ) : null}
      </Map>

      <div className="bg-background/90 text-muted-foreground absolute right-3 bottom-3 z-10 hidden rounded-md border px-2 py-1 text-[10px] backdrop-blur sm:block">
        {visiblePoints.length} mapped ·{' '}
        {isActive ? 'simulation on · ' : ''}
        {journeyRoute ? 'trail on · ' : ''}
        {Object.entries(LAYER_META)
          .filter(([id]) => visibility[id as VisualiserLayerId])
          .map(([id, meta]) => `${meta.label} ${counts[id as VisualiserLayerId]}`)
          .join(' · ')}
      </div>
    </div>
  );
}
