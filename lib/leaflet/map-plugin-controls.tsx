'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet-draw';
import 'leaflet-measure/dist/leaflet-measure.js';
import 'leaflet-easybutton';
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css';
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

export function LeafletMapControls() {
  const map = useMap();
  const drawEnabledRef = useRef(false);
  const measureEnabledRef = useRef(false);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const measureControlRef = useRef<L.Control.Measure | null>(null);
  const toolsBarRef = useRef<L.Control.EasyBar | null>(null);

  useEffect(() => {
    ensureGestureHandlingRegistered();
    map.options.gestureHandling = true;
    map.gestureHandling?.enable();
    map.scrollWheelZoom.disable();

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

    const drawBtn = L.easyButton({
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
    });

    const measureBtn = L.easyButton({
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
    });

    const toolsBar = L.easyBar([drawBtn, measureBtn], { position: 'bottomleft' });
    toolsBarRef.current = toolsBar;
    toolsBar.addTo(map);

    return () => {
      map.removeControl(locate);
      map.removeControl(fullscreen);
      map.removeControl(toolsBar);
      if (drawEnabledRef.current && drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
      if (measureEnabledRef.current && measureControlRef.current) {
        map.removeControl(measureControlRef.current);
      }
      if (drawnItemsRef.current) {
        map.removeLayer(drawnItemsRef.current);
        drawnItemsRef.current = null;
      }
      drawEnabledRef.current = false;
      measureEnabledRef.current = false;
      drawControlRef.current = null;
      measureControlRef.current = null;
      toolsBarRef.current = null;
    };
  }, [map]);

  return null;
}
