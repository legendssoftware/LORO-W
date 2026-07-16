import type { BranchListItem } from '@/api/types/branch';
import type { CompetitorListItem } from '@/api/types/competitors';
import type { MapMarkerBase } from '@/api/types/map';
import { hasStoredCoordinates } from '@/lib/utils/address-map-geocode';
import { branchDisplayName } from '@/lib/utils/branch-map-markers';
import { competitorDisplayName } from '@/lib/utils/competitor-map-markers';

export interface UnmappedMapEntry {
  id: string;
  name: string;
  markerType: string;
  reason: string;
}

function coordReason(
  latitude?: number | string | null,
  longitude?: number | string | null
): string {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'No coordinates';
  if (lat === 0 && lng === 0) return '0,0 in database';
  return 'Invalid coordinates';
}

export function buildUnmappedMapEntries(input: {
  branches?: BranchListItem[];
  competitors?: CompetitorListItem[];
  mapMarkers?: MapMarkerBase[];
}): UnmappedMapEntry[] {
  const out: UnmappedMapEntry[] = [];
  const seen = new Set<string>();

  const push = (entry: UnmappedMapEntry) => {
    const key = `${entry.markerType}:${entry.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(entry);
  };

  for (const b of input.branches ?? []) {
    if (hasStoredCoordinates(b.latitude, b.longitude)) continue;
    push({
      id: String(b.uid),
      name: branchDisplayName(b),
      markerType: 'branch',
      reason: coordReason(b.latitude, b.longitude),
    });
  }

  for (const c of input.competitors ?? []) {
    if (hasStoredCoordinates(c.latitude, c.longitude)) continue;
    push({
      id: String(c.uid),
      name: competitorDisplayName(c),
      markerType: 'competitor',
      reason: coordReason(c.latitude, c.longitude),
    });
  }

  for (const m of input.mapMarkers ?? []) {
    if (hasStoredCoordinates(m.latitude, m.longitude)) continue;
    push({
      id: String(m.id),
      name: String(m.name ?? m.accountName ?? m.id),
      markerType: String(m.markerType ?? 'unknown'),
      reason: coordReason(m.latitude, m.longitude),
    });
  }

  return out.sort((a, b) =>
    a.markerType.localeCompare(b.markerType) || a.name.localeCompare(b.name)
  );
}
