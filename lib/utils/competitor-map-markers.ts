import type { MapMarkerBase } from '@/api/types/map';
import type { CompetitorListItem } from '@/api/types/competitors';
import { formatAddressLine, hasStoredCoordinates } from '@/lib/utils/address-map-geocode';
import {
  brandMarkerColor,
  resolveHardwareBrand,
} from '@/lib/site-opportunity/compute/brands';
import { resolveCompetitorLogoUrl } from '@/lib/utils/resolve-competitor-logo-url';

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

function competitorNumericField(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function competitorListMarkerExtras(c: CompetitorListItem): Partial<MapMarkerBase> {
  return {
    contactPhone: competitorStringField(c.contactPhone),
    contactEmail: competitorStringField(c.contactEmail),
    website: competitorStringField(c.website),
    description: competitorStringField(c.description),
    threatLevel: typeof c.threatLevel === 'number' ? c.threatLevel : undefined,
    isDirect: c.isDirect ?? undefined,
    estimatedAnnualRevenue: competitorNumericField(c.estimatedAnnualRevenue),
  };
}

export interface BuildCompetitorMarkersOptions {
  /** @deprecated Ignored — only persisted coordinates are used. */
  maxNewGeocodes?: number;
}

/**
 * Build competitor markers from GET /competitors list using persisted coordinates only.
 */
export function buildCompetitorMarkersFromList(
  competitors: CompetitorListItem[],
  _options?: BuildCompetitorMarkersOptions
): MapMarkerBase[] {
  const out: MapMarkerBase[] = [];

  for (const c of competitors) {
    if (!hasStoredCoordinates(c.latitude, c.longitude)) continue;

    const lat = Number(c.latitude);
    const lng = Number(c.longitude);
    const line = formatCompetitorAddressLine(c);
    const accountName = competitorStringField(c.accountName);
    const legalEntity = competitorStringField(c.LegalEntity);
    const tradingName = competitorStringField(c.TradingName);
    const brandStatus = competitorStringField(c.brandStatus);
    const alias = competitorStringField(c.alias);
    const brandInput = {
      name: c.name,
      accountName,
      LegalEntity: legalEntity,
    };
    const hardwareBrand = resolveHardwareBrand(brandInput);
    const markerColor = brandMarkerColor(hardwareBrand);
    const logoUrl =
      resolveCompetitorLogoUrl({
        name: c.name,
        accountName,
        LegalEntity: legalEntity,
        TradingName: tradingName,
        brandStatus,
        alias,
      }) ?? undefined;

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
      logoUrl,
      ...competitorListMarkerExtras(c),
    });
  }

  return out;
}
