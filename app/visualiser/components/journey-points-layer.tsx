'use client';

import { useEffect, useMemo, useRef } from 'react';
import type * as GeoJSON from 'geojson';
import type { GeoJSONSource, MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl';
import { useMap } from '@/components/ui/map';
import type { RepJourneyPoint } from '@/api/types/tracking';
import { LAYER_META } from '@/lib/utils/visualiser-map-points';

const SOURCE_ID = 'rep-journey-points';
const MOVE_LAYER_ID = 'rep-journey-move';
const STOP_LAYER_ID = 'rep-journey-stop';
const STOP_LABEL_LAYER_ID = 'rep-journey-stop-label';

type JourneyPointsLayerProps = {
  points: RepJourneyPoint[];
  onPointClick?: (point: RepJourneyPoint) => void;
};

/**
 * Discrete journey markers (no continuous polyline).
 * Stops are larger with a dwell-time label; movement samples are smaller dots.
 */
export function JourneyPointsLayer({
  points,
  onPointClick,
}: JourneyPointsLayerProps) {
  const { map, isLoaded } = useMap();
  const onPointClickRef = useRef(onPointClick);
  onPointClickRef.current = onPointClick;

  const data = useMemo((): GeoJSON.FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: points.map((p, index) => ({
        type: 'Feature',
        id: p.uid ?? index,
        properties: {
          index,
          isStop: p.isStop ? 1 : 0,
          stopLabel: p.stopDurationFormatted ?? '',
          address: p.address ?? '',
          recordedAt: p.recordedAt,
          latitude: p.latitude,
          longitude: p.longitude,
          stopDurationMinutes: p.stopDurationMinutes ?? null,
          stopDurationFormatted: p.stopDurationFormatted ?? null,
          speed: p.speed ?? null,
          accuracy: p.accuracy ?? null,
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

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data,
      });
    }

    if (!map.getLayer(MOVE_LAYER_ID)) {
      map.addLayer({
        id: MOVE_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!=', ['get', 'isStop'], 1],
        paint: {
          'circle-radius': 5,
          'circle-color': LAYER_META.reps.color,
          'circle-opacity': 0.75,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
    }

    if (!map.getLayer(STOP_LAYER_ID)) {
      map.addLayer({
        id: STOP_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'isStop'], 1],
        paint: {
          'circle-radius': 9,
          'circle-color': '#5b21b6',
          'circle-opacity': 0.95,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }

    if (!map.getLayer(STOP_LABEL_LAYER_ID)) {
      map.addLayer({
        id: STOP_LABEL_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
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

    const handleClick = (e: MapMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const props = feature.properties;
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
      });
    };

    const handleEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    for (const layerId of [MOVE_LAYER_ID, STOP_LAYER_ID]) {
      map.on('click', layerId, handleClick as (e: MapLayerMouseEvent) => void);
      map.on('mouseenter', layerId, handleEnter);
      map.on('mouseleave', layerId, handleLeave);
    }

    return () => {
      for (const layerId of [MOVE_LAYER_ID, STOP_LAYER_ID]) {
        map.off(
          'click',
          layerId,
          handleClick as (e: MapLayerMouseEvent) => void
        );
        map.off('mouseenter', layerId, handleEnter);
        map.off('mouseleave', layerId, handleLeave);
      }
      try {
        if (map.getLayer(STOP_LABEL_LAYER_ID)) map.removeLayer(STOP_LABEL_LAYER_ID);
        if (map.getLayer(STOP_LAYER_ID)) map.removeLayer(STOP_LAYER_ID);
        if (map.getLayer(MOVE_LAYER_ID)) map.removeLayer(MOVE_LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // ignore
      }
    };
    // Mount once; data updates via separate effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(data);
  }, [map, isLoaded, data]);

  return null;
}
