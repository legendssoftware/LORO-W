/** Leaflet fullscreen uses z-index 99999 — app chrome must sit above it. */
export const Z_ABOVE_LEAFLET_FULLSCREEN = 100_000;

export const zAboveLeafletFullscreen = 'z-[100000]' as const;

export const zAboveLeafletFullscreenPanel = 'z-[100001]' as const;

/** Theme toggle in sidebar — above sidebar panel and visualiser map overlays. */
export const zAboveLeafletFullscreenThemeToggle = 'z-[100002]' as const;
