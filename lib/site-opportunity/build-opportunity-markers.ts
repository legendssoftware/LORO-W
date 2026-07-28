import type { BranchListItem } from '@/api/types/branch';
import type { ClientListItem } from '@/api/types/clients';
import type { MapMarkerBase } from '@/api/types/map';
import type { CompetitorMapMarker } from '@/api/endpoints/competitors';
import { getBranchDisplayLabel } from '@/api/types/branch';
import {
  formatAddressLine,
  hasStoredCoordinates,
} from '@/lib/utils/address-map-geocode';
import { resolveHardwareBrand } from '@/lib/site-opportunity/compute/brands';

/**
 * Build MapMarkerBase[] for computeSiteOpportunities from visualiser data sources.
 */
export function buildOpportunityMarkers(input: {
  branches: BranchListItem[];
  competitors: CompetitorMapMarker[];
  clients: ClientListItem[];
}): MapMarkerBase[] {
  const markers: MapMarkerBase[] = [];

  for (const branch of input.branches) {
    if (!hasStoredCoordinates(branch.latitude, branch.longitude)) continue;
    const lat = Number(branch.latitude);
    const lng = Number(branch.longitude);
    const name =
      getBranchDisplayLabel(branch) || branch.name || `Branch #${branch.uid}`;
    markers.push({
      id: `branch-${branch.uid}`,
      name,
      alias: branch.alias ?? undefined,
      ref: branch.ref ?? undefined,
      country: branch.country ?? undefined,
      position: [lat, lng],
      latitude: lat,
      longitude: lng,
      markerType: 'branch',
      address: formatAddressLine(branch.address),
      state:
        typeof branch.address === 'object' && branch.address
          ? (branch.address as { state?: string }).state
          : undefined,
    });
  }

  for (const competitor of input.competitors) {
    const [posLat, posLng] = competitor.position ?? [];
    const lat =
      competitor.latitude != null ? Number(competitor.latitude) : posLat;
    const lng =
      competitor.longitude != null ? Number(competitor.longitude) : posLng;
    if (!hasStoredCoordinates(lat, lng)) continue;
    const hardwareBrand = resolveHardwareBrand({
      name: competitor.name,
      accountName: competitor.accountName ?? undefined,
      LegalEntity: competitor.LegalEntity ?? undefined,
    });
    const addr =
      competitor.address && typeof competitor.address === 'object'
        ? competitor.address
        : null;
    markers.push({
      id: competitor.id,
      name: competitor.name,
      accountName: competitor.accountName ?? undefined,
      LegalEntity: competitor.LegalEntity ?? undefined,
      TradingName: competitor.TradingName ?? undefined,
      estimatedAnnualRevenue: competitor.estimatedAnnualRevenue ?? undefined,
      hardwareBrand,
      position: [Number(lat), Number(lng)],
      latitude: Number(lat),
      longitude: Number(lng),
      markerType: 'competitor',
      address: competitor.address ?? undefined,
      country: addr?.country ?? undefined,
      state: addr?.state ?? undefined,
    });
  }

  for (const client of input.clients) {
    const lat = client.latitude as number | string | null | undefined;
    const lng = client.longitude as number | string | null | undefined;
    if (!hasStoredCoordinates(lat, lng)) continue;
    const addr =
      client.address && typeof client.address === 'object'
        ? client.address
        : null;
    markers.push({
      id: client.uid,
      name: client.name,
      position: [Number(lat), Number(lng)],
      latitude: Number(lat),
      longitude: Number(lng),
      markerType: 'client',
      address: formatAddressLine(client.address),
      category: client.category ?? undefined,
      annualRevenue: client.annualRevenue,
      lifetimeValue: client.lifetimeValue,
      country: addr?.country ?? undefined,
      state: addr?.state ?? undefined,
    });
  }

  return markers;
}
