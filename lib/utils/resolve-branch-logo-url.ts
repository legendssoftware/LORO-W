import type { BranchListItem } from '@/api/types/branch';
import type { MapMarkerBase } from '@/api/types/map';
import { ORG_BRANCH_PIN_URL } from '@/lib/leaflet/map-pin-constants';

/** Resolve branch logo for catchment popups and analysis panels. */
export function resolveBranchLogoUrl(
  _branchId: string | number,
  _options?: {
    branchMarkers?: MapMarkerBase[];
    branches?: BranchListItem[];
    orgLogoUrl?: string | null;
  },
): string | undefined {
  return ORG_BRANCH_PIN_URL;
}
