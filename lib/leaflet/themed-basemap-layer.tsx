'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useTheme } from 'next-themes';
import L from 'leaflet';
import { getThemedTileProvider } from '@/lib/leaflet/tile-providers';

import 'leaflet-providers/leaflet-providers.js';

/** Swaps basemap tiles when app light/dark theme changes. */
export function ThemedBasemapLayer() {
  const map = useMap();
  const { resolvedTheme } = useTheme();
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    const provider = getThemedTileProvider(isDark);

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer.provider(
      provider.providerKey,
      provider.options
    );
    tileLayerRef.current.addTo(map);

    return () => {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
    };
  }, [map, resolvedTheme]);

  return null;
}
