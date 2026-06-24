import type { MapMarkerBase } from '@/api/types/map';
import type { BranchListItem } from '@/api/types/branch';
import {
  formatAddressLine,
  geocodeAddressLine,
  hasStoredCoordinates,
  NOMINATIM_DELAY_MS,
  sleep,
} from '@/lib/utils/address-map-geocode';

/** Single-line postal address for geocoding (GET /branch list). */
export function formatBranchAddressLine(b: BranchListItem): string | null {
  return formatAddressLine(b.address);
}

export function branchDisplayName(b: BranchListItem): string {
  const alias = b.alias?.trim();
  const legal = b.name?.trim();
  return alias || legal || `Branch ${b.uid}`;
}

function branchHasStoredCoordinates(b: BranchListItem): boolean {
  return hasStoredCoordinates(b.latitude, b.longitude);
}

/**
 * Build branch markers from org branch list (GET /branch). Geocodes sequentially.
 */
export async function buildBranchMarkersFromList(
  branches: BranchListItem[],
  options?: { logoUrl?: string | null }
): Promise<MapMarkerBase[]> {
  const logoUrl = options?.logoUrl ?? undefined;
  const out: MapMarkerBase[] = [];
  let first = true;
  for (const b of branches) {
    const line = formatBranchAddressLine(b);

    if (branchHasStoredCoordinates(b)) {
      const lat = Number(b.latitude);
      const lng = Number(b.longitude);
      out.push({
        id: `branch-list-${b.uid}`,
        name: branchDisplayName(b),
        position: [lat, lng],
        latitude: lat,
        longitude: lng,
        markerType: 'branch',
        address: line ?? '',
        branchUid: b.uid,
        logoUrl,
      });
      continue;
    }

    if (!line) continue;
    if (!first) await sleep(NOMINATIM_DELAY_MS);
    first = false;
    const coords = await geocodeAddressLine(line, 'LORO-Reports/1.0 (branch map)');
    if (!coords) continue;
    out.push({
      id: `branch-list-${b.uid}`,
      name: branchDisplayName(b),
      position: [coords.lat, coords.lng],
      latitude: coords.lat,
      longitude: coords.lng,
      markerType: 'branch',
      address: line,
      branchUid: b.uid,
      logoUrl,
    });
  }
  return out;
}
