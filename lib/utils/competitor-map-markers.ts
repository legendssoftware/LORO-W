import type { MapMarkerBase } from '@/api/types/map';
import type { CompetitorListItem } from '@/api/types/competitors';
import {
  formatAddressLine,
  geocodeAddressLine,
  hasStoredCoordinates,
  NOMINATIM_DELAY_MS,
  sleep,
} from '@/lib/utils/address-map-geocode';
import {
  brandMarkerColor,
  resolveHardwareBrand,
} from '@/lib/site-opportunity/compute/brands';

export function formatCompetitorAddressLine(c: CompetitorListItem): string | null {
  return formatAddressLine(c.address);
}

export function competitorDisplayName(c: CompetitorListItem): string {
  const name = c.name?.trim();
  return name || `Competitor ${c.uid}`;
}

function competitorStringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export interface BuildCompetitorMarkersOptions {
  /** Cap new Nominatim lookups per run (stored coords are always used). */
  maxNewGeocodes?: number;
}

/**
 * Build competitor markers from GET /competitors list. Geocodes sequentially when coords are missing.
 */
export async function buildCompetitorMarkersFromList(
  competitors: CompetitorListItem[],
  options?: BuildCompetitorMarkersOptions
): Promise<MapMarkerBase[]> {
  const maxNewGeocodes = options?.maxNewGeocodes ?? 100;
  const out: MapMarkerBase[] = [];
  let firstGeocode = true;
  let newGeocodeCount = 0;

  for (const c of competitors) {
    const line = formatCompetitorAddressLine(c);
    const accountName = competitorStringField(c.accountName);
    const legalEntity = competitorStringField(c.LegalEntity);
    const brandInput = {
      name: c.name,
      accountName,
      LegalEntity: legalEntity,
    };
    const hardwareBrand = resolveHardwareBrand(brandInput);
    const markerColor = brandMarkerColor(hardwareBrand);

    if (hasStoredCoordinates(c.latitude, c.longitude)) {
      const lat = Number(c.latitude);
      const lng = Number(c.longitude);
      out.push({
        id: `competitor-list-${c.uid}`,
        name: competitorDisplayName(c),
        position: [lat, lng],
        latitude: lat,
        longitude: lng,
        markerType: 'competitor',
        address: line ?? '',
        competitorRef: c.competitorRef ?? String(c.uid),
        hardwareBrand,
        markerColor,
        accountName,
        LegalEntity: legalEntity,
        industry: c.industry,
        status: c.status ?? 'active',
        logoUrl: c.logoUrl,
      });
      continue;
    }

    if (!line || newGeocodeCount >= maxNewGeocodes) continue;
    if (!firstGeocode) await sleep(NOMINATIM_DELAY_MS);
    firstGeocode = false;
    newGeocodeCount++;
    const coords = await geocodeAddressLine(line, 'LORO-Reports/1.0 (competitor map)');
    if (!coords) continue;

    out.push({
      id: `competitor-list-${c.uid}`,
      name: competitorDisplayName(c),
      position: [coords.lat, coords.lng],
      latitude: coords.lat,
      longitude: coords.lng,
      markerType: 'competitor',
      address: line,
      competitorRef: c.competitorRef ?? String(c.uid),
      hardwareBrand,
      markerColor,
      accountName,
      LegalEntity: legalEntity,
      industry: c.industry,
      status: c.status ?? 'active',
      logoUrl: c.logoUrl,
    });
  }

  return out;
}
