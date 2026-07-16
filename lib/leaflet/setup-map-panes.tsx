'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export const INFLUENCE_PANE = 'influencePane';
export const OVERLAY_PANE = 'overlayPaneCustom';

/** Registers explicit z-index panes so circles sit below markers and opportunity overlays above. */
export function SetupMapPanes() {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane(INFLUENCE_PANE)) {
      const pane = map.createPane(INFLUENCE_PANE);
      pane.style.zIndex = '350';
    }
    if (!map.getPane(OVERLAY_PANE)) {
      const pane = map.createPane(OVERLAY_PANE);
      pane.style.zIndex = '650';
    }
  }, [map]);

  return null;
}
