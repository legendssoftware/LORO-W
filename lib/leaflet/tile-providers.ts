import type { TileLayerOptions } from 'leaflet';
import type { MapMarkerBase } from '@/api/types/map';

export interface MapTileProvider {
  id: string;
  label: string;
  /** leaflet-providers id, e.g. OpenStreetMap.Mapnik */
  providerKey: string;
  options?: TileLayerOptions;
}

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();

/** Curated basemaps for the visualiser. Mapbox is included only when `NEXT_PUBLIC_MAPBOX_TOKEN` is set. */
export function getMapTileProviders(): MapTileProvider[] {
  const providers: MapTileProvider[] = [
    {
      id: 'osm',
      label: 'OpenStreetMap',
      providerKey: 'OpenStreetMap.Mapnik',
    },
    {
      id: 'esri',
      label: 'Esri Streets',
      providerKey: 'Esri.WorldStreetMap',
    },
    {
      id: 'carto',
      label: 'Carto Voyager',
      providerKey: 'CartoDB.Voyager',
    },
  ];

  if (mapboxToken) {
    providers.push({
      id: 'mapbox',
      label: 'Mapbox Streets',
      providerKey: 'MapBox',
      options: {
        accessToken: mapboxToken,
        id: 'mapbox/streets-v12',
      },
    });
  }

  return providers;
}

export const DEFAULT_TILE_PROVIDER_ID = 'osm';

export function getDefaultTileProviderIndex(): number {
  const providers = getMapTileProviders();
  const index = providers.findIndex((p) => p.id === DEFAULT_TILE_PROVIDER_ID);
  return index >= 0 ? index : 0;
}
