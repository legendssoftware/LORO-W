'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useTheme } from 'next-themes';
import L from 'leaflet';
import {
  getFallbackTileProvider,
  getThemedTileProvider,
  isMapboxProvider,
  type MapTileProvider,
} from '@/lib/leaflet/tile-providers';

import 'leaflet-providers/leaflet-providers.js';

const MAPBOX_TILE_ERROR_THRESHOLD = 2;

/** Swaps basemap tiles when app light/dark theme changes. */
export function ThemedBasemapLayer() {
  const map = useMap();
  const { resolvedTheme } = useTheme();
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    let cancelled = false;
    let tileErrorHandler: (() => void) | null = null;

    const removeCurrentLayer = () => {
      if (tileLayerRef.current) {
        if (tileErrorHandler) {
          tileLayerRef.current.off('tileerror', tileErrorHandler);
          tileErrorHandler = null;
        }
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
    };

    const mountLayer = (provider: MapTileProvider, allowMapboxFallback: boolean) => {
      if (cancelled) return;

      removeCurrentLayer();

      const layer = L.tileLayer.provider(provider.providerKey, provider.options);
      layer.addTo(map);
      tileLayerRef.current = layer;

      if (!allowMapboxFallback || !isMapboxProvider(provider)) return;

      let errorCount = 0;

      tileErrorHandler = () => {
        errorCount += 1;
        if (errorCount >= MAPBOX_TILE_ERROR_THRESHOLD) {
          mountLayer(getFallbackTileProvider(isDark), false);
        }
      };

      layer.on('tileerror', tileErrorHandler);
    };

    mountLayer(getThemedTileProvider(isDark), true);

    return () => {
      cancelled = true;
      removeCurrentLayer();
    };
  }, [map, resolvedTheme]);

  return null;
}
