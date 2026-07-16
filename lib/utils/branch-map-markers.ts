import type { MapMarkerBase } from '@/api/types/map';
import type { BranchListItem } from '@/api/types/branch';
import { formatAddressLine, hasStoredCoordinates } from '@/lib/utils/address-map-geocode';

/** Single-line postal address for display (GET /branch list). */
export function formatBranchAddressLine(b: BranchListItem): string | null {
  return formatAddressLine(b.address);
}

export function branchDisplayName(b: BranchListItem): string {
  const alias = b.alias?.trim();
  const legal = b.name?.trim();
  return alias || legal || `Branch ${b.uid}`;
}

function branchStringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Build branch markers from org branch list using persisted coordinates only.
 */
export function buildBranchMarkersFromList(branches: BranchListItem[]): MapMarkerBase[] {
  const out: MapMarkerBase[] = [];

  for (const b of branches) {
    if (!hasStoredCoordinates(b.latitude, b.longitude)) continue;

    const lat = Number(b.latitude);
    const lng = Number(b.longitude);
    const line = formatBranchAddressLine(b);

    out.push({
      id: `branch-list-${b.uid}`,
      name: branchDisplayName(b),
      position: [lat, lng],
      latitude: lat,
      longitude: lng,
      markerType: 'branch',
      address: line ?? '',
      branchUid: b.uid,
      logoUrl: b.logoUrl?.trim() || null,
      email: branchStringField(b.email),
      phone: branchStringField(b.phone),
      contactPerson: branchStringField(b.contactPerson),
    });
  }

  return out;
}
