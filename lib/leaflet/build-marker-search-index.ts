import type { MapMarkerBase } from '@/api/types/map';
import type { ClientAddress } from '@/api/types/clients';
import {
  getMarkerBusinessTypeKey,
  getMarkerRegionGroupKey,
  resolveMarkerAddressParts,
} from '@/lib/utils/map-marker-filters';
import { formatAddressLine } from '@/lib/utils/address-map-geocode';
import { markerTypeLabel } from '@/app/reports/components/map-report-constants';

export interface MarkerSearchEntry {
  id: string;
  lat: number;
  lng: number;
  title: string;
  searchText: string;
  marker: MapMarkerBase;
}

function markerSearchAddress(marker: MapMarkerBase): string {
  const raw = marker.address;
  if (typeof raw === 'string') {
    return raw.trim();
  }
  const fromLine = formatAddressLine(raw as ClientAddress);
  if (fromLine) return fromLine;
  const parts = resolveMarkerAddressParts(marker);
  return parts.lineParts.join(', ');
}

function buildSearchTitle(marker: MapMarkerBase): string {
  const name = String(marker.name ?? marker.id ?? 'Unknown');
  const markerType = String(marker.markerType ?? '');
  const typeLabel = markerTypeLabel(markerType);
  const address = markerSearchAddress(marker);
  const region = getMarkerRegionGroupKey(marker);
  const businessType = getMarkerBusinessTypeKey(marker);

  const segments = [name, typeLabel];
  if (address) segments.push(address);
  else if (region && region !== 'Unmapped') segments.push(region);
  if (businessType && businessType !== 'Not set') segments.push(businessType);

  return segments.join(' · ');
}

/** In-memory search index — replaces ghost Leaflet markers for leaflet-search. */
export function buildMarkerSearchIndex(markers: MapMarkerBase[]): MarkerSearchEntry[] {
  const entries: MarkerSearchEntry[] = [];

  for (const marker of markers) {
    const lat = marker.latitude;
    const lng = marker.longitude;
    if (lat == null || lng == null) continue;

    const name = String(marker.name ?? marker.id ?? 'Unknown');
    const markerType = String(marker.markerType ?? '');
    const address = markerSearchAddress(marker);
    const region = getMarkerRegionGroupKey(marker);
    const businessType = getMarkerBusinessTypeKey(marker);
    const typeLabel = markerTypeLabel(markerType);
    const title = buildSearchTitle(marker);
    const searchText = [name, markerType, typeLabel, address, region, businessType]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    entries.push({
      id: String(marker.id),
      lat: Number(lat),
      lng: Number(lng),
      title,
      searchText,
      marker,
    });
  }

  return entries;
}

export function searchMarkerIndex(
  index: MarkerSearchEntry[],
  query: string,
  limit = 20
): MarkerSearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches: MarkerSearchEntry[] = [];
  for (const entry of index) {
    if (entry.searchText.includes(q)) {
      matches.push(entry);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}
