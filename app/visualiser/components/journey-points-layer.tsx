'use client';

import { useEffect, useMemo, useRef } from 'react';
import type * as GeoJSON from 'geojson';
import type { GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import { useMap } from '@/components/ui/map';
import type { RepJourneyPoint } from '@/api/types/tracking';
import { trailBearingAtIndex } from '@/lib/utils/journey-point-format';
import { LAYER_META } from '@/lib/utils/visualiser-map-points';

const DEFAULT_LAYER_PREFIX = 'rep-journey';

export type JourneyPointClickPayload = RepJourneyPoint & {
  pointIndex: number;
  bearingDegrees: number | null;
  isTrailEnd: boolean;
};

type JourneyPointsLayerProps = {
  points: RepJourneyPoint[];
  /** Unique prefix for MapLibre source/layer ids (required when tracing multiple reps). */
  layerIdPrefix?: string;
  /** When false, only stop markers and the trail-end marker are shown (route lines carry movement). */
  showMovementDots?: boolean;
  onPointClick?: (point: JourneyPointClickPayload) => void;
};

/**
 * Journey markers on the tracked route polyline.
 * Stops are larger with a dwell-time label; movement samples are smaller dots.
 * The chronologically last trail point gets a ringed end marker.
 */
export function JourneyPointsLayer({
  points,
  layerIdPrefix = DEFAULT_LAYER_PREFIX,
  showMovementDots = false,
  onPointClick,
}: JourneyPointsLayerProps) {
  const { map, isLoaded } = useMap();
  const onPointClickRef = useRef(onPointClick);
  onPointClickRef.current = onPointClick;

  const sourceId = `${layerIdPrefix}-points`;
  const moveLayerId = `${layerIdPrefix}-move`;
  const stopLayerId = `${layerIdPrefix}-stop`;
  const trailEndLayerId = `${layerIdPrefix}-trail-end`;
  const stopLabelLayerId = `${layerIdPrefix}-stop-label`;

  const data = useMemo((): GeoJSON.FeatureCollection => {
    const lastIndex = points.length > 0 ? points.length - 1 : -1;
    return {
      type: 'FeatureCollection',
      features: points.map((p, index) => ({
        type: 'Feature',
        id: p.uid ?? index,
        properties: {
          index,
          isStop: p.isStop ? 1 : 0,
          isLast: index === lastIndex ? 1 : 0,
          stopLabel: p.stopDurationFormatted ?? '',
          address: p.address ?? '',
          recordedAt: p.recordedAt,
          latitude: p.latitude,
          longitude: p.longitude,
          stopDurationMinutes: p.stopDurationMinutes ?? null,
          stopDurationFormatted: p.stopDurationFormatted ?? null,
          speed: p.speed ?? null,
          accuracy: p.accuracy ?? null,
          bearingDegrees: trailBearingAtIndex(points, index),
        },
        geometry: {
          type: 'Point',
          coordinates: [p.longitude, p.latitude],
        },
      })),
    };
  }, [points]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data,
      });
    }

    if (showMovementDots && !map.getLayer(moveLayerId)) {
      map.addLayer({
        id: moveLayerId,
        type: 'circle',
        source: sourceId,
        filter: [
          'all',
          ['!=', ['get', 'isStop'], 1],
          ['!=', ['get', 'isLast'], 1],
        ],
        paint: {
          'circle-radius': 5,
          'circle-color': LAYER_META.reps.color,
          'circle-opacity': 0.75,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
    }

    if (!map.getLayer(stopLayerId)) {
      map.addLayer({
        id: stopLayerId,
        type: 'circle',
        source: sourceId,
        filter: [
          'all',
          ['==', ['get', 'isStop'], 1],
          ['!=', ['get', 'isLast'], 1],
        ],
        paint: {
          'circle-radius': 9,
          'circle-color': '#5b21b6',
          'circle-opacity': 0.95,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }

    if (!map.getLayer(trailEndLayerId)) {
      map.addLayer({
        id: trailEndLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['==', ['get', 'isLast'], 1],
        paint: {
          'circle-radius': 11,
          'circle-color': '#6d28d9',
          'circle-opacity': 1,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#f5f3ff',
        },
      });
    }

    if (!map.getLayer(stopLabelLayerId)) {
      map.addLayer({
        id: stopLabelLayerId,
        type: 'symbol',
        source: sourceId,
        filter: [
          'all',
          ['==', ['get', 'isStop'], 1],
          ['!=', ['get', 'stopLabel'], ''],
        ],
        layout: {
          'text-field': ['get', 'stopLabel'],
          'text-size': 11,
          'text-offset': [0, 1.35],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#4c1d95',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });
    }

    const handleClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const props = feature.properties;
      const pointIndex = Number(props.index);
      onPointClickRef.current?.({
        latitude: Number(props.latitude),
        longitude: Number(props.longitude),
        recordedAt: String(props.recordedAt),
        address: props.address ? String(props.address) : null,
        isStop: Number(props.isStop) === 1,
        stopDurationMinutes:
          props.stopDurationMinutes != null
            ? Number(props.stopDurationMinutes)
            : null,
        stopDurationFormatted: props.stopDurationFormatted
          ? String(props.stopDurationFormatted)
          : null,
        speed: props.speed != null ? Number(props.speed) : null,
        accuracy: props.accuracy != null ? Number(props.accuracy) : null,
        pointIndex: Number.isFinite(pointIndex) ? pointIndex : 0,
        bearingDegrees:
          props.bearingDegrees != null && props.bearingDegrees !== ''
            ? Number(props.bearingDegrees)
            : null,
        isTrailEnd: Number(props.isLast) === 1,
      });
    };

    const handleEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    const clickLayers = showMovementDots
      ? [moveLayerId, stopLayerId, trailEndLayerId]
      : [stopLayerId, trailEndLayerId];
    for (const layerId of clickLayers) {
      map.on('click', layerId, handleClick);
      map.on('mouseenter', layerId, handleEnter);
      map.on('mouseleave', layerId, handleLeave);
    }

    return () => {
      for (const layerId of clickLayers) {
        map.off('click', layerId, handleClick);
        map.off('mouseenter', layerId, handleEnter);
        map.off('mouseleave', layerId, handleLeave);
      }
      try {
        if (map.getLayer(stopLabelLayerId)) map.removeLayer(stopLabelLayerId);
        if (map.getLayer(trailEndLayerId)) map.removeLayer(trailEndLayerId);
        if (map.getLayer(stopLayerId)) map.removeLayer(stopLayerId);
        if (map.getLayer(moveLayerId)) map.removeLayer(moveLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // Mount once; data updates via separate effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, showMovementDots, layerIdPrefix]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    source?.setData(data);
  }, [map, isLoaded, data, sourceId]);

  return null;
}
