import L from 'leaflet';
import type { MapMarkerBase } from '@/api/types/map';
import {
  getMarkerBusinessTypeKey,
  getMarkerRegionGroupKey,
} from '@/lib/utils/map-marker-filters';

const hiddenSearchIcon = L.divIcon({
  className: 'reports-viz-search-hidden',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

const SEARCH_MARKER_META = Symbol('searchMarkerMeta');

interface SearchMarkerMeta {
  marker: MapMarkerBase;
}

function setSearchMarkerMeta(layer: L.Layer, marker: MapMarkerBase) {
  (layer as L.Layer & { [SEARCH_MARKER_META]?: SearchMarkerMeta })[SEARCH_MARKER_META] = {
    marker,
  };
}

/** Invisible markers used by leaflet-search; real pins stay in react-leaflet layers. */
export function buildSearchLayer(markers: MapMarkerBase[]): L.FeatureGroup {
  const group = L.featureGroup();

  for (const marker of markers) {
    const lat = marker.latitude;
    const lng = marker.longitude;
    if (lat == null || lng == null) continue;

    const name = String(marker.name ?? marker.id ?? 'Unknown');
    const markerType = String(marker.markerType ?? '');
    const address = String(marker.address ?? '').trim();
    const region = getMarkerRegionGroupKey(marker);
    const businessType = getMarkerBusinessTypeKey(marker);
    const title = [name, markerType, address, region, businessType]
      .filter(Boolean)
      .join(' · ');

    const searchMarker = L.marker([Number(lat), Number(lng)], {
      icon: hiddenSearchIcon,
      title,
      opacity: 0,
      interactive: false,
    });

    setSearchMarkerMeta(searchMarker, marker);
    group.addLayer(searchMarker);
  }

  return group;
}

export function resolveMarkerFromSearchLayer(layer: L.Layer | undefined): MapMarkerBase | null {
  if (!layer) return null;
  const meta = (layer as L.Layer & { [SEARCH_MARKER_META]?: SearchMarkerMeta })[
    SEARCH_MARKER_META
  ];
  return meta?.marker ?? null;
}
