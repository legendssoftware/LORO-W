import type { MapMarkerBase } from '@/api/types/map';
import type { BranchListItem } from '@/api/types/branch';

const NOMINATIM_DELAY_MS = 1100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Single-line postal address for geocoding (GET /branch list). */
export function formatBranchAddressLine(b: BranchListItem): string | null {
  const a = b.address;
  if (!a) return null;
  const parts = [a.street, a.suburb, a.city, a.state, a.postalCode, a.country].filter(
    (p) => (p ?? '').toString().trim() !== ''
  );
  return parts.length ? parts.join(', ') : null;
}

export function branchDisplayName(b: BranchListItem): string {
  const alias = b.alias?.trim();
  const legal = b.name?.trim();
  return alias || legal || `Branch ${b.uid}`;
}

/**
 * Forward geocode via OpenStreetMap Nominatim (respect ~1 req/s usage policy).
 */
async function geocodeAddressLine(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'LORO-Reports/1.0 (branch map)',
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat ?? '');
  const lng = parseFloat(data[0].lon ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Build branch markers from org branch list (GET /branch). Geocodes sequentially.
 */
export async function buildBranchMarkersFromList(
  branches: BranchListItem[]
): Promise<MapMarkerBase[]> {
  const out: MapMarkerBase[] = [];
  let first = true;
  for (const b of branches) {
    const line = formatBranchAddressLine(b);
    if (!line) continue;
    if (!first) await sleep(NOMINATIM_DELAY_MS);
    first = false;
    const coords = await geocodeAddressLine(line);
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
    });
  }
  return out;
}
