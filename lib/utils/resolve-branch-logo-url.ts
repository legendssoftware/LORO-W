import type { BranchListItem } from '@/api/types/branch';
import type { MapMarkerBase } from '@/api/types/map';

function markerLogoUrl(marker: MapMarkerBase): string | undefined {
  const raw =
    marker.logoUrl?.trim() ||
    (typeof marker.logo === 'string' ? marker.logo.trim() : undefined);
  return raw || undefined;
}

function findBranchMarker(
  branchId: string | number,
  branchMarkers: MapMarkerBase[],
): MapMarkerBase | undefined {
  const idStr = String(branchId);
  return branchMarkers.find(
    (m) =>
      String(m.id) === idStr ||
      String(m.id) === `branch-${idStr}` ||
      String(m.id) === `branch-list-${idStr}` ||
      (m.branchUid != null && String(m.branchUid) === idStr),
  );
}

function findBranchListItem(
  branchId: string | number,
  branches: BranchListItem[],
): BranchListItem | undefined {
  const idStr = String(branchId);
  const listUidMatch = /^branch-list-(\d+)$/.exec(idStr);
  if (listUidMatch?.[1]) {
    const uid = Number(listUidMatch[1]);
    return branches.find((b) => b.uid === uid);
  }

  const stripped = idStr.replace(/^branch-/, '');
  return branches.find(
    (b) =>
      String(b.uid) === idStr ||
      String(b.uid) === stripped ||
      b.ref === idStr ||
      b.ref === stripped,
  );
}

/** Resolve branch logo for catchment popups and analysis panels. */
export function resolveBranchLogoUrl(
  branchId: string | number,
  options?: {
    branchMarkers?: MapMarkerBase[];
    branches?: BranchListItem[];
    orgLogoUrl?: string | null;
  },
): string | undefined {
  const { branchMarkers = [], branches = [], orgLogoUrl } = options ?? {};

  const marker = findBranchMarker(branchId, branchMarkers);
  if (marker) {
    const url = markerLogoUrl(marker);
    if (url) return url;
  }

  const branch = findBranchListItem(branchId, branches);
  if (branch?.logoUrl?.trim()) return branch.logoUrl.trim();

  if (orgLogoUrl?.trim()) return orgLogoUrl.trim();

  return undefined;
}
