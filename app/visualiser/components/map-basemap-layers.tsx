'use client';

import { useEffect } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useMap } from '@/components/ui/map';

export type BasemapLayerId =
  | 'satellite'
  | 'terrain'
  | 'hillshade'
  | 'buildings3d';

export interface BasemapLayerVisibility {
  satellite: boolean;
  terrain: boolean;
  hillshade: boolean;
  buildings3d: boolean;
}

export const DEFAULT_BASEMAP_VISIBILITY: BasemapLayerVisibility = {
  satellite: false,
  terrain: false,
  hillshade: false,
  buildings3d: false,
};

export const BASEMAP_LAYERS: { id: BasemapLayerId; labelKey: string }[] = [
  { id: 'satellite', labelKey: 'chrome.visualiser.basemap.satellite' },
  { id: 'terrain', labelKey: 'chrome.visualiser.basemap.terrain' },
  { id: 'hillshade', labelKey: 'chrome.visualiser.basemap.hillshade' },
  { id: 'buildings3d', labelKey: 'chrome.visualiser.basemap.buildings3d' },
];

const DEM_SOURCE = 'visualiser-terrain-dem';
const HILLSHADE_LAYER = 'visualiser-hillshade';
const SATELLITE_SOURCE = 'visualiser-satellite';
const SATELLITE_LAYER = 'visualiser-satellite';
const BUILDINGS_LAYER = 'visualiser-buildings-3d';

/** Sentinel-2 cloudless, no API key. z/y/x is the WMTS order. */
const SATELLITE_TILES = [
  'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg',
];

/** Public Terrarium DEM used by the MapLibre terrain examples. */
const DEM_TILES = [
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
];

function firstRoadOrLabelId(map: MapLibreMap): string | undefined {
  return map
    .getStyle()
    ?.layers?.find((layer) => layer.type === 'line' || layer.type === 'symbol')
    ?.id;
}

function buildingsSourceId(map: MapLibreMap): string | null {
  if (map.getSource('protomaps')) return 'protomaps';
  const sources = map.getStyle()?.sources;
  if (!sources) return null;
  for (const [id, source] of Object.entries(sources)) {
    if (source.type === 'vector') return id;
  }
  return null;
}

function removeLayer(map: MapLibreMap, id: string) {
  if (map.getLayer(id)) map.removeLayer(id);
}

function removeSource(map: MapLibreMap, id: string) {
  if (map.getSource(id)) map.removeSource(id);
}

/**
 * Optional imagery, relief, and extruded buildings on the CARTO / Protomaps style.
 * Re-runs after every style load because a theme swap drops custom sources.
 */
export function MapBasemapLayers({
  visibility,
}: {
  visibility: BasemapLayerVisibility;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const needsDem = visibility.terrain || visibility.hillshade;

    try {
      if (needsDem && !map.getSource(DEM_SOURCE)) {
        map.addSource(DEM_SOURCE, {
          type: 'raster-dem',
          encoding: 'terrarium',
          tiles: DEM_TILES,
          maxzoom: 15,
          tileSize: 256,
          attribution: 'Terrain: AWS Terrain Tiles',
        });
      }

      if (visibility.satellite) {
        if (!map.getSource(SATELLITE_SOURCE)) {
          map.addSource(SATELLITE_SOURCE, {
            type: 'raster',
            tiles: SATELLITE_TILES,
            tileSize: 256,
            maxzoom: 16,
            attribution: 'Sentinel-2 cloudless © EOX',
          });
        }
        if (!map.getLayer(SATELLITE_LAYER)) {
          const beforeId = map.getLayer(HILLSHADE_LAYER)
            ? HILLSHADE_LAYER
            : firstRoadOrLabelId(map);
          map.addLayer(
            {
              id: SATELLITE_LAYER,
              type: 'raster',
              source: SATELLITE_SOURCE,
            },
            beforeId,
          );
        }
      } else {
        removeLayer(map, SATELLITE_LAYER);
        removeSource(map, SATELLITE_SOURCE);
      }

      if (visibility.hillshade && map.getSource(DEM_SOURCE)) {
        if (!map.getLayer(HILLSHADE_LAYER)) {
          map.addLayer(
            {
              id: HILLSHADE_LAYER,
              type: 'hillshade',
              source: DEM_SOURCE,
              paint: {
                'hillshade-exaggeration': 0.4,
                'hillshade-shadow-color': '#1c1917',
                'hillshade-highlight-color': '#f5f5f4',
              },
            },
            firstRoadOrLabelId(map),
          );
        }
      } else {
        removeLayer(map, HILLSHADE_LAYER);
      }

      if (visibility.terrain && map.getSource(DEM_SOURCE)) {
        map.setTerrain({ source: DEM_SOURCE, exaggeration: 1.4 });
      } else if (map.getTerrain()) {
        map.setTerrain(null);
      }

      if (visibility.buildings3d) {
        const sourceId = buildingsSourceId(map);
        if (sourceId && !map.getLayer(BUILDINGS_LAYER)) {
          const beforeLabel = map
            .getStyle()
            ?.layers?.find((layer) => layer.type === 'symbol')?.id;
          map.addLayer(
            {
              id: BUILDINGS_LAYER,
              type: 'fill-extrusion',
              source: sourceId,
              'source-layer': 'buildings',
              minzoom: 13,
              paint: {
                'fill-extrusion-color': '#94a3b8',
                'fill-extrusion-opacity': 0.8,
                'fill-extrusion-height': [
                  'case',
                  ['>', ['to-number', ['get', 'height'], 0], 0],
                  ['to-number', ['get', 'height'], 0],
                  ['>', ['to-number', ['get', 'render_height'], 0], 0],
                  ['to-number', ['get', 'render_height'], 0],
                  ['>', ['to-number', ['get', 'levels'], 0], 0],
                  ['*', ['to-number', ['get', 'levels'], 0], 3],
                  12,
                ],
                'fill-extrusion-base': [
                  'case',
                  ['>', ['to-number', ['get', 'min_height'], 0], 0],
                  ['to-number', ['get', 'min_height'], 0],
                  ['>', ['to-number', ['get', 'render_min_height'], 0], 0],
                  ['to-number', ['get', 'render_min_height'], 0],
                  0,
                ],
              },
            },
            beforeLabel,
          );
        }
      } else {
        removeLayer(map, BUILDINGS_LAYER);
      }

      if (!needsDem) {
        removeLayer(map, HILLSHADE_LAYER);
        if (map.getTerrain()) map.setTerrain(null);
        removeSource(map, DEM_SOURCE);
      }
    } catch {
      // A theme style swap can drop sources while this effect is cleaning up.
    }

    return () => {
      try {
        if (!map.getStyle()) return;
        removeLayer(map, BUILDINGS_LAYER);
        removeLayer(map, HILLSHADE_LAYER);
        removeLayer(map, SATELLITE_LAYER);
        removeSource(map, SATELLITE_SOURCE);
        if (map.getTerrain()) map.setTerrain(null);
        removeSource(map, DEM_SOURCE);
      } catch {
        // Style reload already removed these sources.
      }
    };
  }, [
    map,
    isLoaded,
    visibility.satellite,
    visibility.terrain,
    visibility.hillshade,
    visibility.buildings3d,
  ]);

  return null;
}
