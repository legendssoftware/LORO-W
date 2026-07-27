'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type * as GeoJSON from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import { useMap } from '@/components/ui/map';
import {
  BRANCH_HQ_LOGO_SLUG,
  COMPETITOR_LOGO_SLUGS,
  competitorLogoPublicPath,
  type CompetitorLogoSlug,
} from '@/lib/utils/map-marker-logos';
import type { VisualiserMapPoint } from '@/lib/utils/visualiser-map-points';
import { LAYER_META } from '@/lib/utils/visualiser-map-points';

const CLIENT_HANDSHAKE_IMAGE_ID = 'client-handshake-icon';
const HQ_BORDERED_IMAGE_ID = 'comp-logo-bitdrywall-hq';
const HQ_BORDER_COLOR = '#22c55e';

type LogoClusterLayerProps = {
  points: VisualiserMapPoint[];
  clusterColor: string;
  pointColor: string;
  /** Prefer logo / avatar / handshake icons for unclustered points. */
  useLogoIcons?: boolean;
  /** Layer id — drives HQ green border + client handshake. */
  layerId?: keyof typeof LAYER_META;
  onPointClick?: (point: VisualiserMapPoint, coordinates: [number, number]) => void;
};

function slugFromPublicPath(url: string | null | undefined): CompetitorLogoSlug | null {
  if (!url) return null;
  const match = url.match(/\/competitor\/([a-z0-9]+)\.png/i);
  if (!match) return null;
  const slug = match[1].toLowerCase() as CompetitorLogoSlug;
  return COMPETITOR_LOGO_SLUGS.includes(slug) ? slug : null;
}

function isRemoteOrAbsoluteUrl(url: string): boolean {
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('/')
  );
}

function safeImageId(prefix: string, key: string): string {
  return `${prefix}-${key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}`;
}

function isMapStyleReady(m: MapLibreMap | null | undefined): m is MapLibreMap {
  try {
    return !!m?.getStyle();
  } catch {
    return false;
  }
}

function mapHasImage(m: MapLibreMap, id: string): boolean {
  try {
    return isMapStyleReady(m) && m.hasImage(id);
  } catch {
    return false;
  }
}

function mapAddImage(m: MapLibreMap, id: string, bitmap: ImageBitmap): void {
  try {
    if (!isMapStyleReady(m) || mapHasImage(m, id)) return;
    m.addImage(id, bitmap, { sdf: false });
  } catch {
    // map torn down or image already registered
  }
}

/** Downscale / composite pin bitmaps for MapLibre textures. */
async function loadPinBitmap(
  url: string,
  size = 64,
  options?: { borderColor?: string; circular?: boolean },
): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
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
    if (options?.circular) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }
    ctx.drawImage(bitmap, 0, 0, size, size);
    bitmap.close();

    if (options?.borderColor || options?.circular) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.strokeStyle = options.borderColor ?? '#ffffff';
      ctx.lineWidth = options.borderColor ? 5 : 3;
      ctx.stroke();
    }
    return createImageBitmap(canvas);
  } catch {
    return null;
  }
}

/** Blue circle + white handshake (Lucide-style) for client pins. */
async function loadHandshakeBitmap(size = 64): Promise<ImageBitmap | null> {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#2563eb"/>
      <path d="m11 17 2 2a1 1 0 1 0 3-3" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.74-3.74a2 2 0 0 0-2.82 0L9 13" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="m8 12 3.5-3.5a2 2 0 0 1 2.82 0L16 11" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="m2 15 6-6" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="m7 20 5-5" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  );
  return loadPinBitmap(`data:image/svg+xml,${svg}`, size);
}

function resolveIconMeta(
  point: VisualiserMapPoint,
  useLogoIcons: boolean,
  layerId?: keyof typeof LAYER_META,
): { iconId: string; hasIcon: number } {
  if (!useLogoIcons) return { iconId: '', hasIcon: 0 };

  if (layerId === 'clients') {
    return { iconId: CLIENT_HANDSHAKE_IMAGE_ID, hasIcon: 1 };
  }

  if (layerId === 'hq') {
    const slug = slugFromPublicPath(point.logoUrl) ?? BRANCH_HQ_LOGO_SLUG;
    if (slug === BRANCH_HQ_LOGO_SLUG) {
      return { iconId: HQ_BORDERED_IMAGE_ID, hasIcon: 1 };
    }
    return { iconId: `comp-logo-${slug}`, hasIcon: 1 };
  }

  if (layerId === 'reps' && point.logoUrl && isRemoteOrAbsoluteUrl(point.logoUrl)) {
    return { iconId: safeImageId('rep-avatar', point.id), hasIcon: 1 };
  }

  const slug = slugFromPublicPath(point.logoUrl);
  if (slug) return { iconId: `comp-logo-${slug}`, hasIcon: 1 };

  // HQ already handled above; fallback logo for branch pins without a slug.
  if (layerId === 'branches' && (!point.logoUrl || !slugFromPublicPath(point.logoUrl))) {
    return {
      iconId: `comp-logo-${BRANCH_HQ_LOGO_SLUG}`,
      hasIcon: 1,
    };
  }

  return { iconId: '', hasIcon: 0 };
}

/**
 * Clustered GeoJSON layer with optional competitor/branch/HQ logos,
 * client handshake icons, and sales-rep avatars.
 */
export function LogoClusterLayer({
  points,
  clusterColor,
  pointColor,
  useLogoIcons = true,
  layerId,
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
  const [layersReady, setLayersReady] = useState(false);

  const data = useMemo((): GeoJSON.FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: points.map((p) => {
        const { iconId, hasIcon } = resolveIconMeta(p, useLogoIcons, layerId);
        return {
          type: 'Feature' as const,
          id: p.id,
          properties: {
            id: p.id,
            layer: p.layer,
            name: p.name,
            iconId,
            hasIcon,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [p.longitude, p.latitude],
          },
        };
      }),
    };
  }, [points, useLogoIcons, layerId]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    let cancelled = false;

    async function ensureImages() {
      if (!useLogoIcons || !isMapStyleReady(map) || cancelled) return;

      await Promise.all(
        COMPETITOR_LOGO_SLUGS.map(async (slug) => {
          if (cancelled || !isMapStyleReady(map)) return;
          const imageId = `comp-logo-${slug}`;
          if (mapHasImage(map, imageId)) return;
          try {
            const bitmap = await loadPinBitmap(competitorLogoPublicPath(slug), 64);
            if (cancelled || !bitmap || !isMapStyleReady(map)) return;
            mapAddImage(map, imageId, bitmap);
          } catch {
            // skip
          }
        }),
      );

      if (cancelled || !isMapStyleReady(map)) return;

      if (layerId === 'hq' && !mapHasImage(map, HQ_BORDERED_IMAGE_ID)) {
        const bitmap = await loadPinBitmap(
          competitorLogoPublicPath(BRANCH_HQ_LOGO_SLUG),
          64,
          { borderColor: HQ_BORDER_COLOR, circular: true },
        );
        if (!cancelled && bitmap && isMapStyleReady(map)) {
          mapAddImage(map, HQ_BORDERED_IMAGE_ID, bitmap);
        }
      }

      if (cancelled || !isMapStyleReady(map)) return;

      if (layerId === 'clients' && !mapHasImage(map, CLIENT_HANDSHAKE_IMAGE_ID)) {
        const bitmap = await loadHandshakeBitmap(64);
        if (!cancelled && bitmap && isMapStyleReady(map)) {
          mapAddImage(map, CLIENT_HANDSHAKE_IMAGE_ID, bitmap);
        }
      }

      if (cancelled || !isMapStyleReady(map)) return;

      if (layerId === 'reps') {
        await Promise.all(
          points.map(async (p) => {
            if (cancelled || !isMapStyleReady(map)) return;
            if (!p.logoUrl || !isRemoteOrAbsoluteUrl(p.logoUrl)) return;
            const imageId = safeImageId('rep-avatar', p.id);
            if (mapHasImage(map, imageId)) return;
            const bitmap = await loadPinBitmap(p.logoUrl, 64, {
              circular: true,
              borderColor: '#ffffff',
            });
            if (cancelled || !bitmap || !isMapStyleReady(map)) return;
            mapAddImage(map, imageId, bitmap);
          }),
        );
      }
    }

    void ensureImages().then(() => {
      if (cancelled || !isMapStyleReady(map)) return;
      if (map.getSource(sourceId)) {
        if (!cancelled) setLayersReady(true);
        return;
      }

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
          'circle-stroke-width': layerId === 'hq' ? 3 : 2,
          'circle-stroke-color': layerId === 'hq' ? HQ_BORDER_COLOR : '#ffffff',
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
            'icon-size': layerId === 'clients' || layerId === 'reps' ? 0.95 : 1.1,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
        });
      }

      if (!cancelled) setLayersReady(true);
    });

    return () => {
      cancelled = true;
      setLayersReady(false);
      if (!isMapStyleReady(map)) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (source) source.setData(data);
  }, [isLoaded, map, data, sourceId]);

  /** Reload rep avatars when points change. */
  useEffect(() => {
    if (!isLoaded || !isMapStyleReady(map) || !useLogoIcons || layerId !== 'reps') return;
    let cancelled = false;
    void (async () => {
      for (const p of points) {
        if (cancelled || !isMapStyleReady(map)) return;
        if (!p.logoUrl || !isRemoteOrAbsoluteUrl(p.logoUrl)) continue;
        const imageId = safeImageId('rep-avatar', p.id);
        if (mapHasImage(map, imageId)) continue;
        const bitmap = await loadPinBitmap(p.logoUrl, 64, {
          circular: true,
          borderColor: '#ffffff',
        });
        if (cancelled || !bitmap || !isMapStyleReady(map)) continue;
        mapAddImage(map, imageId, bitmap);
      }
      if (!cancelled && isMapStyleReady(map)) {
        const source = map.getSource(sourceId) as GeoJSONSource | undefined;
        source?.setData(data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, map, points, useLogoIcons, layerId, sourceId, data]);

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
    if (!isLoaded || !map || !layersReady) return;
    const raise = () => {
      for (const id of [
        clusterLayerId,
        clusterCountId,
        unclusteredCircleId,
        unclusteredSymbolId,
      ]) {
        if (map.getLayer(id)) {
          try {
            map.moveLayer(id);
          } catch {
            // ignore
          }
        }
      }
    };
    raise();
    map.on('sourcedata', raise);
    return () => {
      map.off('sourcedata', raise);
    };
  }, [
    isLoaded,
    map,
    layersReady,
    clusterLayerId,
    clusterCountId,
    unclusteredCircleId,
    unclusteredSymbolId,
  ]);

  useEffect(() => {
    if (!isLoaded || !map || !layersReady) return;

    const clickable = [clusterLayerId, unclusteredCircleId, unclusteredSymbolId];

    const handleClick = async (e: MapMouseEvent) => {
      const layerIds = clickable.filter((id) => map.getLayer(id));
      if (!layerIds.length) return;
      const features = map.queryRenderedFeatures(e.point, { layers: layerIds });
      if (!features.length) return;

      const feature =
        features.find((f) => !f.properties?.cluster) ?? features[0]!;
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];

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

    for (const id of clickable) {
      if (!map.getLayer(id)) continue;
      map.on('click', id, handleClick);
      map.on('mouseenter', id, handleEnter);
      map.on('mouseleave', id, handleLeave);
    }

    return () => {
      if (!map) return;
      for (const id of clickable) {
        try {
          if (!map.getLayer(id)) continue;
          map.off('click', id, handleClick);
          map.off('mouseenter', id, handleEnter);
          map.off('mouseleave', id, handleLeave);
        } catch {
          /* map may already be removed */
        }
      }
    };
  }, [
    isLoaded,
    map,
    layersReady,
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
        const useLogos =
          layer === 'competitors' ||
          layer === 'branches' ||
          layer === 'hq' ||
          layer === 'clients' ||
          layer === 'reps';
        return (
          <LogoClusterLayer
            key={layer}
            points={pts}
            clusterColor={meta.color}
            pointColor={meta.color}
            useLogoIcons={useLogos}
            layerId={layer}
            onPointClick={onPointClick}
          />
        );
      })}
    </>
  );
}
