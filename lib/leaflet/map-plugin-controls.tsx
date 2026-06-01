'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MapMarkerBase } from '@/api/types/map';
import {
  buildSearchLayer,
  resolveMarkerFromSearchLayer,
} from '@/lib/leaflet/build-search-layer';
import {
  getDefaultTileProviderIndex,
  getMapTileProviders,
  type MapTileProvider,
} from '@/lib/leaflet/tile-providers';

import 'leaflet-providers/leaflet-providers.js';
import 'leaflet-search';
import 'leaflet-draw';
import 'leaflet-measure/dist/leaflet-measure.js';
import 'leaflet-easybutton';
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css';
import 'leaflet-search/dist/leaflet-search.min.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-measure/dist/leaflet-measure.css';
import 'leaflet-gesture-handling/dist/leaflet-gesture-handling.min.css';
import 'leaflet.fullscreen/dist/Control.FullScreen.css';
import 'leaflet-easybutton/src/easy-button.css';

import { LocateControl } from 'leaflet.locatecontrol';
import { FullScreen } from 'leaflet.fullscreen';
import { GestureHandling } from 'leaflet-gesture-handling';

let gestureHandlingRegistered = false;

function ensureGestureHandlingRegistered() {
  if (gestureHandlingRegistered) return;
  L.Map.addInitHook('addHandler', 'gestureHandling', GestureHandling);
  gestureHandlingRegistered = true;
}

export interface LeafletMapControlsProps {
  markers: MapMarkerBase[];
  onSelectMarker?: (marker: MapMarkerBase) => void;
  onSuggestedAreas?: () => void;
}

function swapBasemap(
  map: L.Map,
  tileLayerRef: React.MutableRefObject<L.TileLayer | null>,
  provider: MapTileProvider
) {
  if (tileLayerRef.current) {
    map.removeLayer(tileLayerRef.current);
  }
  tileLayerRef.current = L.tileLayer.provider(provider.providerKey, provider.options);
  tileLayerRef.current.addTo(map);
}

export function LeafletMapControls({
  markers,
  onSelectMarker,
  onSuggestedAreas,
}: LeafletMapControlsProps) {
  const map = useMap();
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const providerIndexRef = useRef(getDefaultTileProviderIndex());
  const providersRef = useRef<MapTileProvider[]>(getMapTileProviders());
  const drawEnabledRef = useRef(false);
  const measureEnabledRef = useRef(false);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const measureControlRef = useRef<L.Control.Measure | null>(null);
  const searchControlRef = useRef<L.Control.Search | null>(null);
  const basemapButtonRef = useRef<L.Control.EasyButton | null>(null);

  useEffect(() => {
    ensureGestureHandlingRegistered();
    map.options.gestureHandling = true;
    map.gestureHandling?.enable();
    map.scrollWheelZoom.disable();

    const providers = providersRef.current;
    const initialProvider = providers[providerIndexRef.current] ?? providers[0];
    swapBasemap(map, tileLayerRef, initialProvider);

    const locate = new LocateControl({
      position: 'topleft',
      drawCircle: true,
      drawMarker: true,
      setView: 'always',
      keepCurrentZoomLevel: false,
      locateOptions: { enableHighAccuracy: true, maxZoom: 16 },
      strings: { title: 'Show my location' },
    });
    locate.addTo(map);

    const search = L.control.search({
      position: 'topleft',
      layer: buildSearchLayer(markers),
      initial: false,
      zoom: 15,
      marker: false,
      textPlaceholder: 'Search markers…',
      textCancel: 'Cancel',
      hideMarkerOnCollapse: true,
      moveToLocation: (latlng: L.LatLngExpression) => {
        map.setView(latlng, Math.max(map.getZoom(), 14));
      },
    });
    search.addTo(map);
    searchControlRef.current = search;

    const onSearchFound = (event: L.SearchLocationFoundEvent) => {
      const marker = resolveMarkerFromSearchLayer(event.layer);
      if (marker) onSelectMarker?.(marker);
    };
    search.on('search:locationfound', onSearchFound);

    const fullscreen = new FullScreen({
      position: 'topright',
      title: 'Full screen',
      titleCancel: 'Exit full screen',
      forceSeparateButton: true,
    });
    fullscreen.addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: { allowIntersection: false, showArea: true },
        polyline: true,
        rectangle: true,
        circle: true,
        marker: true,
        circlemarker: false,
      },
      edit: { featureGroup: drawnItems },
    });
    drawControlRef.current = drawControl;

    const measureControl = L.control.measure({
      position: 'topright',
      primaryLengthUnit: 'meters',
      secondaryLengthUnit: 'kilometers',
      primaryAreaUnit: 'sqmeters',
      secondaryAreaUnit: 'hectares',
    });
    measureControlRef.current = measureControl;

    const basemapButton = L.easyButton({
      position: 'bottomleft',
      leafletClasses: true,
      states: providers.map((provider) => ({
        stateName: provider.id,
        title: `Basemap: ${provider.label} (click to cycle)`,
        icon: `<span class="reports-viz-easybtn">${provider.label.slice(0, 1)}</span>`,
        onClick: (_btn, activeMap) => {
          providerIndexRef.current = (providerIndexRef.current + 1) % providers.length;
          const nextProvider = providers[providerIndexRef.current] ?? providers[0];
          swapBasemap(activeMap, tileLayerRef, nextProvider);
          basemapButtonRef.current?.state(nextProvider.id);
        },
      })),
    });
    basemapButtonRef.current = basemapButton;
    basemapButton.state(initialProvider.id);

    const easyButtons: L.Control.EasyButton[] = [basemapButton];

    if (onSuggestedAreas) {
      easyButtons.push(
        L.easyButton({
          position: 'bottomleft',
          leafletClasses: true,
          states: [
            {
              stateName: 'suggested',
              title: 'Suggested areas',
              icon: '<span class="reports-viz-easybtn">★</span>',
              onClick: () => onSuggestedAreas(),
            },
          ],
        })
      );
    }

    easyButtons.push(
      L.easyButton({
        position: 'bottomleft',
        leafletClasses: true,
        states: [
          {
            stateName: 'draw-off',
            title: 'Toggle draw tools',
            icon: '<span class="reports-viz-easybtn">✎</span>',
            onClick: (btn) => {
              const drawControlInstance = drawControlRef.current;
              const measureControlInstance = measureControlRef.current;
              if (!drawControlInstance) return;

              if (drawEnabledRef.current) {
                map.removeControl(drawControlInstance);
                drawEnabledRef.current = false;
                btn.state('draw-off');
                return;
              }

              if (measureEnabledRef.current && measureControlInstance) {
                map.removeControl(measureControlInstance);
                measureEnabledRef.current = false;
              }

              map.addControl(drawControlInstance);
              drawEnabledRef.current = true;
              btn.state('draw-on');
            },
          },
          {
            stateName: 'draw-on',
            title: 'Hide draw tools',
            icon: '<span class="reports-viz-easybtn">✎</span>',
            onClick: (btn) => {
              const drawControlInstance = drawControlRef.current;
              if (!drawControlInstance || !drawEnabledRef.current) return;
              map.removeControl(drawControlInstance);
              drawEnabledRef.current = false;
              btn.state('draw-off');
            },
          },
        ],
      })
    );

    easyButtons.push(
      L.easyButton({
        position: 'bottomleft',
        leafletClasses: true,
        states: [
          {
            stateName: 'measure-off',
            title: 'Toggle measure tool',
            icon: '<span class="reports-viz-easybtn">↔</span>',
            onClick: (btn) => {
              const measureControlInstance = measureControlRef.current;
              const drawControlInstance = drawControlRef.current;
              if (!measureControlInstance) return;

              if (measureEnabledRef.current) {
                map.removeControl(measureControlInstance);
                measureEnabledRef.current = false;
                btn.state('measure-off');
                return;
              }

              if (drawEnabledRef.current && drawControlInstance) {
                map.removeControl(drawControlInstance);
                drawEnabledRef.current = false;
              }

              map.addControl(measureControlInstance);
              measureEnabledRef.current = true;
              btn.state('measure-on');
            },
          },
          {
            stateName: 'measure-on',
            title: 'Hide measure tool',
            icon: '<span class="reports-viz-easybtn">↔</span>',
            onClick: (btn) => {
              const measureControlInstance = measureControlRef.current;
              if (!measureControlInstance || !measureEnabledRef.current) return;
              map.removeControl(measureControlInstance);
              measureEnabledRef.current = false;
              btn.state('measure-off');
            },
          },
        ],
      })
    );

    const easyBar = L.easyBar(easyButtons, { position: 'bottomleft' });
    easyBar.addTo(map);

    return () => {
      search.off('search:locationfound', onSearchFound);
      map.removeControl(locate);
      map.removeControl(search);
      map.removeControl(fullscreen);
      map.removeControl(easyBar);
      if (drawEnabledRef.current && drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
      if (measureEnabledRef.current && measureControlRef.current) {
        map.removeControl(measureControlRef.current);
      }
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
      if (drawnItemsRef.current) {
        map.removeLayer(drawnItemsRef.current);
        drawnItemsRef.current = null;
      }
      drawEnabledRef.current = false;
      measureEnabledRef.current = false;
      searchControlRef.current = null;
      drawControlRef.current = null;
      measureControlRef.current = null;
      basemapButtonRef.current = null;
    };
  }, [map, onSelectMarker, onSuggestedAreas]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      searchControlRef.current?.setLayer(buildSearchLayer(markers));
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [markers]);

  return null;
}
