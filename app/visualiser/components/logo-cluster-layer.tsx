'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type * as GeoJSON from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, ExpressionSpecification } from 'maplibre-gl';
import { useMap } from '@/components/ui/map';
import {
  BRANCH_HQ_LOGO_SLUG,
  COMPETITOR_LOGO_SLUGS,
  competitorLogoPublicPath,
  type CompetitorLogoSlug,
} from '@/lib/utils/map-marker-logos';
import type { VisualiserMapPoint } from '@/lib/utils/visualiser-map-points';
import { LAYER_META } from '@/lib/utils/visualiser-map-points';

const HQ_BORDERED_IMAGE_ID = 'comp-logo-bitdrywall-hq';
const HQ_BORDER_COLOR = '#22c55e';

/** Logical pin texture size — high-res logos are composited here before MapLibre upload. */
const PIN_TEXTURE_SIZE = 256;
/** Target on-screen pin diameter in CSS px. */
const PIN_DISPLAY_SIZE = 72;
/** MapLibre icon-size = display / texture (pixelRatio on addImage is handled separately). */
const PIN_ICON_SIZE = PIN_DISPLAY_SIZE / PIN_TEXTURE_SIZE;
/** Slightly smaller pins for rep avatars (preserves prior relative sizing). */
const PIN_ICON_SIZE_COMPACT = PIN_ICON_SIZE * (0.95 / 1.1);

function getPinPixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

type LogoClusterLayerProps = {
  points: VisualiserMapPoint[];
  clusterColor: string;
  pointColor: string;
  /** Prefer logo / avatar icons for unclustered points. */
  useLogoIcons?: boolean;
  /** Layer id — drives HQ green border and rep avatars. */
  layerId?: keyof typeof LAYER_META;
  /** When false each point renders as its own marker (used for sales reps). */
  enableClustering?: boolean;
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

type PinBitmapResult = { bitmap: ImageBitmap; pixelRatio: number };

function mapAddImage(
  m: MapLibreMap,
  id: string,
  bitmap: ImageBitmap,
  pixelRatio = 1,
): void {
  try {
    if (!isMapStyleReady(m) || mapHasImage(m, id)) return;
    m.addImage(id, bitmap, { sdf: false, pixelRatio });
  } catch {
    // map torn down or image already registered
  }
}

function mapHasLayer(m: MapLibreMap, id: string): boolean {
  try {
    return isMapStyleReady(m) && !!m.getLayer(id);
  } catch {
    return false;
  }
}

function mapHasSource(m: MapLibreMap, id: string): boolean {
  try {
    return isMapStyleReady(m) && !!m.getSource(id);
  } catch {
    return false;
  }
}

/** Load via <img> so data:/blob: URLs use img-src (not connect-src / fetch). */
function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url.slice(0, 64)}`));
    img.src = url;
  });
}

async function loadDrawable(
  url: string,
): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
  // data: fetch() is blocked by connect-src CSP; img-src already allows data:.
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    const img = await loadHtmlImage(url);
    return { source: img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
  }
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
}

/** Composite pin bitmaps for MapLibre — preserves aspect ratio, no upscaling. */
async function loadPinBitmap(
  url: string,
  size = PIN_TEXTURE_SIZE,
  options?: { borderColor?: string; circular?: boolean },
): Promise<PinBitmapResult | null> {
  try {
    const pixelRatio = getPinPixelRatio();
    const physicalSize = Math.round(size * pixelRatio);

    const drawable = await loadDrawable(url);
    const canvas = document.createElement('canvas');
    canvas.width = physicalSize;
    canvas.height = physicalSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      drawable.close?.();
      return null;
    }
    ctx.scale(pixelRatio, pixelRatio);
    ctx.clearRect(0, 0, size, size);
    if (options?.circular) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    const fitScale = Math.min(size / drawable.width, size / drawable.height, 1);
    const drawW = drawable.width * fitScale;
    const drawH = drawable.height * fitScale;
    const drawX = (size - drawW) / 2;
    const drawY = (size - drawH) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(drawable.source, drawX, drawY, drawW, drawH);
    drawable.close?.();

    if (options?.borderColor || options?.circular) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.strokeStyle = options.borderColor ?? '#ffffff';
      ctx.lineWidth = options.borderColor ? 5 : 3;
      ctx.stroke();
    }
    const result = await createImageBitmap(canvas);
    return { bitmap: result, pixelRatio };
  } catch {
    return null;
  }
}

function iconSizeForLayer(layerId?: keyof typeof LAYER_META): number {
  return layerId === 'reps' ? PIN_ICON_SIZE_COMPACT : PIN_ICON_SIZE;
}

/** Zoom-aware icon size — grows when zoomed in without upscaling the texture. */
function iconSizeExpression(baseSize: number): ExpressionSpecification {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    baseSize * 0.75,
    14,
    baseSize,
    18,
    baseSize * 1.25,
  ];
}

function resolveIconMeta(
  point: VisualiserMapPoint,
  useLogoIcons: boolean,
  layerId?: keyof typeof LAYER_META,
): { iconId: string; hasIcon: number } {
  if (!useLogoIcons) return { iconId: '', hasIcon: 0 };

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
 * Clustered GeoJSON layer with optional competitor/branch/HQ logos
 * and sales-rep avatars.
 */
export function LogoClusterLayer({
  points,
  clusterColor,
  pointColor,
  useLogoIcons = true,
  layerId,
  enableClustering = true,
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
  const isRepLayer = layerId === 'reps';
  const shouldCluster = enableClustering && !isRepLayer;
  const [layersReady, setLayersReady] = useState(false);

  const unclusteredCircleFilter: ExpressionSpecification = isRepLayer
    ? ['!', ['has', 'point_count']]
    : [
        'all',
        ['!', ['has', 'point_count']],
        ['!=', ['get', 'hasIcon'], 1],
      ];

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
            const loaded = await loadPinBitmap(competitorLogoPublicPath(slug));
            if (cancelled || !loaded || !isMapStyleReady(map)) return;
            mapAddImage(map, imageId, loaded.bitmap, loaded.pixelRatio);
          } catch {
            // skip
          }
        }),
      );

      if (cancelled || !isMapStyleReady(map)) return;

      if (layerId === 'hq' && !mapHasImage(map, HQ_BORDERED_IMAGE_ID)) {
        const loaded = await loadPinBitmap(
          competitorLogoPublicPath(BRANCH_HQ_LOGO_SLUG),
          PIN_TEXTURE_SIZE,
          { borderColor: HQ_BORDER_COLOR, circular: true },
        );
        if (!cancelled && loaded && isMapStyleReady(map)) {
          mapAddImage(map, HQ_BORDERED_IMAGE_ID, loaded.bitmap, loaded.pixelRatio);
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
            const loaded = await loadPinBitmap(p.logoUrl, PIN_TEXTURE_SIZE, {
              circular: true,
              borderColor: '#ffffff',
            });
            if (cancelled || !loaded || !isMapStyleReady(map)) return;
            mapAddImage(map, imageId, loaded.bitmap, loaded.pixelRatio);
          }),
        );
      }
    }

    void ensureImages().then(() => {
      if (cancelled || !isMapStyleReady(map)) return;
      if (mapHasSource(map, sourceId)) {
        if (!cancelled) setLayersReady(true);
        return;
      }

      map.addSource(sourceId, {
        type: 'geojson',
        data,
        ...(shouldCluster
          ? { cluster: true, clusterMaxZoom: 14, clusterRadius: 52 }
          : { cluster: false }),
      });

      if (shouldCluster) {
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
            'circle-stroke-width': 0,
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
            'text-font': ['Open Sans Bold'],
            'text-size': 14,
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': '#ffffff',
          },
        });
      }

      map.addLayer({
        id: unclusteredCircleId,
        type: 'circle',
        source: sourceId,
        filter: unclusteredCircleFilter,
        paint: {
          'circle-color': pointColor,
          'circle-radius': isRepLayer ? 16 : 14,
          'circle-stroke-width': layerId === 'hq' ? 3 : 2,
          'circle-stroke-color': layerId === 'hq' ? HQ_BORDER_COLOR : '#ffffff',
          'circle-opacity': isRepLayer ? 0.35 : 1,
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
            'icon-size': iconSizeExpression(iconSizeForLayer(layerId)),
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
        if (mapHasLayer(map, unclusteredSymbolId)) map.removeLayer(unclusteredSymbolId);
        if (mapHasLayer(map, unclusteredCircleId)) map.removeLayer(unclusteredCircleId);
        if (mapHasLayer(map, clusterCountId)) map.removeLayer(clusterCountId);
        if (mapHasLayer(map, clusterLayerId)) map.removeLayer(clusterLayerId);
        if (mapHasSource(map, sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || !isMapStyleReady(map)) return;
    if (!mapHasSource(map, sourceId)) return;
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
        const loaded = await loadPinBitmap(p.logoUrl, PIN_TEXTURE_SIZE, {
          circular: true,
          borderColor: '#ffffff',
        });
        if (cancelled || !loaded || !isMapStyleReady(map)) continue;
        mapAddImage(map, imageId, loaded.bitmap, loaded.pixelRatio);
      }
      if (!cancelled && isMapStyleReady(map) && mapHasSource(map, sourceId)) {
        const source = map.getSource(sourceId) as GeoJSONSource | undefined;
        source?.setData(data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, map, points, useLogoIcons, layerId, sourceId, data]);

  useEffect(() => {
    if (!isLoaded || !map || !isMapStyleReady(map)) return;
    try {
      if (mapHasLayer(map, clusterLayerId)) {
        map.setPaintProperty(clusterLayerId, 'circle-color', clusterColor);
      }
      if (mapHasLayer(map, unclusteredCircleId)) {
        map.setPaintProperty(unclusteredCircleId, 'circle-color', pointColor);
      }
    } catch {
      // style torn down mid-update
    }
  }, [isLoaded, map, clusterLayerId, unclusteredCircleId, clusterColor, pointColor]);

  useEffect(() => {
    if (!isLoaded || !map || !layersReady) return;
    const raise = () => {
      if (!isMapStyleReady(map)) return;
      for (const id of [
        clusterLayerId,
        clusterCountId,
        unclusteredCircleId,
        unclusteredSymbolId,
      ]) {
        if (!mapHasLayer(map, id)) continue;
        try {
          map.moveLayer(id);
        } catch {
          // ignore
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
    if (!isLoaded || !map || !layersReady || !isMapStyleReady(map)) return;

    const clickable = [clusterLayerId, unclusteredCircleId, unclusteredSymbolId];

    const handleClick = async (e: MapMouseEvent) => {
      if (!isMapStyleReady(map)) return;
      const layerIds = clickable.filter((id) => mapHasLayer(map, id));
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
        if (!mapHasSource(map, sourceId)) return;
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
      if (!mapHasLayer(map, id)) continue;
      map.on('click', id, handleClick);
      map.on('mouseenter', id, handleEnter);
      map.on('mouseleave', id, handleLeave);
    }

    return () => {
      if (!map) return;
      for (const id of clickable) {
        try {
          if (!mapHasLayer(map, id)) continue;
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
          layer === 'reps';
        return (
          <LogoClusterLayer
            key={layer}
            points={pts}
            clusterColor={meta.color}
            pointColor={meta.color}
            useLogoIcons={useLogos}
            layerId={layer}
            enableClustering={layer !== 'reps'}
            onPointClick={onPointClick}
          />
        );
      })}
    </>
  );
}
