import type { ProviderTileLayerOptions } from 'leaflet';

export interface MapTileProvider {
  id: string;
  label: string;
  /** leaflet-providers id, e.g. OpenStreetMap.Mapnik */
  providerKey: string;
  options?: ProviderTileLayerOptions;
}

/** Only Mapbox styles need a token; OSM/Carto work without credentials. */
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();

const LIGHT_CARTO: MapTileProvider = {
  id: 'carto-voyager',
  label: 'Carto Voyager',
  providerKey: 'CartoDB.Voyager',
};

const DARK_CARTO: MapTileProvider = {
  id: 'carto-dark',
  label: 'Carto Dark Matter',
  providerKey: 'CartoDB.DarkMatter',
};

const LIGHT_OSM: MapTileProvider = {
  id: 'osm',
  label: 'OpenStreetMap',
  providerKey: 'OpenStreetMap.Mapnik',
};

function mapboxLight(): MapTileProvider | null {
  if (!mapboxToken) return null;
  return {
    id: 'mapbox-light',
    label: 'Mapbox Streets',
    providerKey: 'MapBox',
    options: {
      accessToken: mapboxToken,
      id: 'mapbox/streets-v12',
    },
  };
}

function mapboxDark(): MapTileProvider | null {
  if (!mapboxToken) return null;
  return {
    id: 'mapbox-dark',
    label: 'Mapbox Dark',
    providerKey: 'MapBox',
    options: {
      accessToken: mapboxToken,
      id: 'mapbox/dark-v11',
    },
  };
}

/** Token-free basemap when Mapbox is missing or fails at runtime. */
export function getFallbackTileProvider(isDark: boolean): MapTileProvider {
  return isDark ? DARK_CARTO : LIGHT_OSM;
}

export function isMapboxProvider(provider: MapTileProvider): boolean {
  return provider.providerKey === 'MapBox';
}

/** Theme-aware default basemap for the visualiser. */
export function getThemedTileProvider(isDark: boolean): MapTileProvider {
  if (isDark) {
    return mapboxDark() ?? getFallbackTileProvider(true);
  }
  return mapboxLight() ?? getFallbackTileProvider(false);
}

/** Default Leaflet basemap when Mapbox is unavailable. */
export function getFallbackLightProvider(): MapTileProvider {
  return getFallbackTileProvider(false);
}

/** @deprecated Basemap cycling removed — use getThemedTileProvider. */
export function getMapTileProviders(): MapTileProvider[] {
  const providers: MapTileProvider[] = [LIGHT_OSM, LIGHT_CARTO, DARK_CARTO];
  const mb = mapboxLight();
  if (mb) providers.push(mb);
  return providers;
}

export const DEFAULT_TILE_PROVIDER_ID = 'carto-voyager';

/** @deprecated */
export function getDefaultTileProviderIndex(): number {
  return 0;
}
