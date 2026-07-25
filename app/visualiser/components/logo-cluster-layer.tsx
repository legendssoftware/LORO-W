'use client';

import { useEffect, useId, useMemo, useRef } from 'react';
import type * as GeoJSON from 'geojson';
import type {
  GeoJSONSource,
  MapMouseEvent,
  MapGeoJSONFeature,
} from 'maplibre-gl';
import { useMap } from '@/components/ui/map';
import {
  COMPETITOR_LOGO_SLUGS,
  competitorLogoPublicPath,
  type CompetitorLogoSlug,
} from '@/lib/utils/map-marker-logos';
import type { VisualiserMapPoint } from '@/lib/utils/visualiser-map-points';
import { LAYER_META } from '@/lib/utils/visualiser-map-points';

type LogoClusterLayerProps = {
  points: VisualiserMapPoint[];
  clusterColor: string;
  pointColor: string;
  /** Prefer logo icons for unclustered points when `logoUrl` is a /competitor/*.png path. */
  useLogoIcons?: boolean;
  onPointClick?: (point: VisualiserMapPoint, coordinates: [number, number]) => void;
};

function slugFromPublicPath(url: string | null | undefined): CompetitorLogoSlug | null {
  if (!url) return null;
  const match = url.match(/\/competitor\/([a-z0-9]+)\.png/i);
  if (!match) return null;
  const slug = match[1].toLowerCase() as CompetitorLogoSlug;
  return COMPETITOR_LOGO_SLUGS.includes(slug) ? slug : null;
}

/** Downscale large public logos so MapLibre textures stay within GPU limits. */
async function loadPinBitmap(url: string, size = 64): Promise<ImageBitmap | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();
  return createImageBitmap(canvas);
}

/**
 * Clustered GeoJSON layer with optional competitor/branch logo icons.
 */
export function LogoClusterLayer({
  points,
  clusterColor,
  pointColor,
  useLogoIcons = true,
  onPointClick,
}: LogoClusterLayerProps) {
  const { map, isLoaded } = useMap();
  const reactId = useId();
  const sourceId = `logo-cluster-src-${reactId}`;
  const clusterLayerId = `logo-clusters-${reactId}`;
  const clusterCountId = `logo-cluster-count-${reactId}`;
  const unclusteredCircleId = `logo-unclustered-circle-${reactId}`;
  const unclusteredSymbolId = `logo-unclustered-symbol-${reactId}`;
  const onPointClickRef = useRef(onPointClick);
  onPointClickRef.current = onPointClick;
  const pointsByIdRef = useRef(new Map<string, VisualiserMapPoint>());
  pointsByIdRef.current = new Map(points.map((p) => [p.id, p]));

  const data = useMemo((): GeoJSON.FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: points.map((p) => {
        const slug = slugFromPublicPath(p.logoUrl);
        return {
          type: 'Feature' as const,
          id: p.id,
          properties: {
            id: p.id,
            layer: p.layer,
            name: p.name,
            iconId: slug ? `comp-logo-${slug}` : '',
            hasIcon: slug && useLogoIcons ? 1 : 0,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [p.longitude, p.latitude],
          },
        };
      }),
    };
  }, [points, useLogoIcons]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    let cancelled = false;

    async function ensureImages() {
      if (!useLogoIcons) return;
      await Promise.all(
        COMPETITOR_LOGO_SLUGS.map(async (slug) => {
          const imageId = `comp-logo-${slug}`;
          if (map!.hasImage(imageId)) return;
          try {
            const bitmap = await loadPinBitmap(competitorLogoPublicPath(slug), 64);
            if (cancelled || !bitmap || map!.hasImage(imageId)) return;
            map!.addImage(imageId, bitmap, { sdf: false });
          } catch {
            // skip missing / failed logo
          }
        })
      );
    }

    void ensureImages().then(() => {
      if (cancelled || !map) return;
      if (map.getSource(sourceId)) return;

      map.addSource(sourceId, {
        type: 'geojson',
        data,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 52,
      });

      map.addLayer({
        id: clusterLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': clusterColor,
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            36,
            25,
            48,
            80,
            64,
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });

      map.addLayer({
        id: clusterCountId,
        type: 'symbol',
        source: sourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 14,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      map.addLayer({
        id: unclusteredCircleId,
        type: 'circle',
        source: sourceId,
        filter: [
          'all',
          ['!', ['has', 'point_count']],
          ['!=', ['get', 'hasIcon'], 1],
        ],
        paint: {
          'circle-color': pointColor,
          'circle-radius': 14,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      if (useLogoIcons) {
        map.addLayer({
          id: unclusteredSymbolId,
          type: 'symbol',
          source: sourceId,
          filter: [
            'all',
            ['!', ['has', 'point_count']],
            ['==', ['get', 'hasIcon'], 1],
          ],
          layout: {
            'icon-image': ['get', 'iconId'],
            'icon-size': 1.1,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
        });
      }
    });

    return () => {
      cancelled = true;
      try {
        if (map.getLayer(unclusteredSymbolId)) map.removeLayer(unclusteredSymbolId);
        if (map.getLayer(unclusteredCircleId)) map.removeLayer(unclusteredCircleId);
        if (map.getLayer(clusterCountId)) map.removeLayer(clusterCountId);
        if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // Mount once per map load — data updates via separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (source) source.setData(data);
  }, [isLoaded, map, data, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    if (map.getLayer(clusterLayerId)) {
      map.setPaintProperty(clusterLayerId, 'circle-color', clusterColor);
    }
    if (map.getLayer(unclusteredCircleId)) {
      map.setPaintProperty(unclusteredCircleId, 'circle-color', pointColor);
    }
  }, [isLoaded, map, clusterLayerId, unclusteredCircleId, clusterColor, pointColor]);

  useEffect(() => {
    if (!isLoaded || !map) return;

    const clickable = [clusterLayerId, unclusteredCircleId, unclusteredSymbolId];

    const handleClick = async (
      e: MapMouseEvent & { features?: MapGeoJSONFeature[] }
    ) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: clickable.filter((id) => map.getLayer(id)),
      });
      if (!features.length) return;
      const feature = features[0];
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      if (feature.properties?.cluster) {
        const clusterId = feature.properties.cluster_id as number;
        const source = map.getSource(sourceId) as GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({ center: coords, zoom, duration: 500 });
        return;
      }

      const featureId = String(feature.properties?.id ?? feature.id ?? '');
      const point =
        pointsByIdRef.current.get(featureId) ??
        ({
          ...(feature.properties as object),
          id: featureId,
          latitude: coords[1],
          longitude: coords[0],
        } as VisualiserMapPoint);
      onPointClickRef.current?.(point, coords);
      map.flyTo({
        center: coords,
        zoom: Math.max(map.getZoom(), 14),
        duration: 700,
        essential: true,
      });
    };

    const handleEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    for (const layerId of clickable) {
      if (!map.getLayer(layerId)) continue;
      map.on('click', layerId, handleClick);
      map.on('mouseenter', layerId, handleEnter);
      map.on('mouseleave', layerId, handleLeave);
    }

    return () => {
      for (const layerId of clickable) {
        if (!map.getLayer(layerId)) continue;
        map.off('click', layerId, handleClick);
        map.off('mouseenter', layerId, handleEnter);
        map.off('mouseleave', layerId, handleLeave);
      }
    };
  }, [
    isLoaded,
    map,
    sourceId,
    clusterLayerId,
    unclusteredCircleId,
    unclusteredSymbolId,
  ]);

  return null;
}

/** Convenience: one clustered layer per visualiser category color. */
export function LayeredLogoClusters({
  pointsByLayer,
  onPointClick,
}: {
  pointsByLayer: Partial<Record<keyof typeof LAYER_META, VisualiserMapPoint[]>>;
  onPointClick?: (point: VisualiserMapPoint, coordinates: [number, number]) => void;
}) {
  return (
    <>
      {(Object.keys(LAYER_META) as Array<keyof typeof LAYER_META>).map((layer) => {
        const pts = pointsByLayer[layer] ?? [];
        if (pts.length === 0) return null;
        const meta = LAYER_META[layer];
        const useLogos = layer === 'competitors' || layer === 'branches' || layer === 'hq';
        return (
          <LogoClusterLayer
            key={layer}
            points={pts}
            clusterColor={meta.color}
            pointColor={meta.color}
            useLogoIcons={useLogos}
            onPointClick={onPointClick}
          />
        );
      })}
    </>
  );
}
