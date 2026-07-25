import type { BranchListItem } from '@/api/types/branch';
import type { ClientListItem } from '@/api/types/clients';
import type { CompetitorListItem } from '@/api/types/competitors';
import type { LatestRepLocation } from '@/api/types/tracking';
import type { OrganisationProfile } from '@/api/types/organisation';
import { getBranchDisplayLabel } from '@/api/types/branch';
import {
  formatAddressLine,
  hasStoredCoordinates,
} from '@/lib/utils/address-map-geocode';
import {
  branchOrHqLogoUrl,
  resolveCompetitorLogoUrl,
} from '@/lib/utils/map-marker-logos';
import { resolveHardwareBrand } from '@/lib/site-opportunity/compute/brands';

export type VisualiserLayerId =
  | 'branches'
  | 'hq'
  | 'clients'
  | 'competitors'
  | 'reps';

export interface VisualiserMapHighlight {
  label: string;
  value: string;
}

export interface VisualiserMapPoint {
  id: string;
  layer: VisualiserLayerId;
  name: string;
  latitude: number;
  longitude: number;
  /** Public logo path or remote avatar URL for the pin / popup. */
  logoUrl: string | null;
  address?: string | null;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Revenue / sales / credit-style metric label + value. */
  metricLabel?: string | null;
  metricValue?: string | null;
  /** Extra highlight metrics shown in the marker popup body. */
  highlights?: VisualiserMapHighlight[];
  branchLabel?: string | null;
  positionLabel?: string | null;
  status?: string | null;
  subtitle?: string | null;
  recordedAt?: string | null;
  /** Competitor uid for PATCH updates from the map popup. */
  competitorUid?: number;
  /** Hardware brand key for group revenue updates (e.g. CASHBUILD). */
  brandKey?: string | null;
  /** Raw estimated annual revenue (ZAR) for competitor popup editing. */
  estimatedAnnualRevenue?: number | null;
}

function formatMoney(value: unknown): string | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n === 0) return null;
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

function isHqBranchName(name: string): boolean {
  const n = name.toLowerCase();
  return (
    /\bhq\b/.test(n) ||
    n.includes('head office') ||
    n.includes('headquarters') ||
    n.includes('head-office')
  );
}

export function branchToMapPoints(branches: BranchListItem[]): VisualiserMapPoint[] {
  const points: VisualiserMapPoint[] = [];
  for (const branch of branches) {
    if (!hasStoredCoordinates(branch.latitude, branch.longitude)) continue;
    const label = getBranchDisplayLabel(branch) || branch.name || `Branch #${branch.uid}`;
    const isHq = isHqBranchName(label) || isHqBranchName(branch.name ?? '');
    points.push({
      id: isHq ? `hq-branch-${branch.uid}` : `branch-${branch.uid}`,
      layer: isHq ? 'hq' : 'branches',
      name: label,
      latitude: Number(branch.latitude),
      longitude: Number(branch.longitude),
      logoUrl: branch.logoUrl?.trim() || branchOrHqLogoUrl(),
      address: formatAddressLine(branch.address),
      contact: branch.contactPerson ?? null,
      phone: branch.phone ?? null,
      email: branch.email ?? null,
      branchLabel: label,
      positionLabel: isHq ? 'Headquarters' : 'Branch',
      status: branch.status ?? null,
      subtitle: isHq ? 'Company HQ' : 'Company branch',
    });
  }
  return points;
}

export function organisationHqPoint(
  org: OrganisationProfile | null | undefined
): VisualiserMapPoint | null {
  if (!org) return null;
  const lat = org.address?.latitude;
  const lng = org.address?.longitude;
  if (!hasStoredCoordinates(lat, lng)) return null;
  return {
    id: `hq-org-${org.uid}`,
    layer: 'hq',
    name: org.alias?.trim() || org.name || 'Headquarters',
    latitude: Number(lat),
    longitude: Number(lng),
    logoUrl: org.logo?.trim() || branchOrHqLogoUrl(),
    address: formatAddressLine(org.address),
    contact: null,
    phone: org.phone ?? null,
    email: org.email ?? null,
    positionLabel: 'Headquarters',
    subtitle: 'Organisation HQ',
  };
}

export function competitorToMapPoint(
  competitor: Pick<
    CompetitorListItem,
    | 'uid'
    | 'name'
    | 'latitude'
    | 'longitude'
    | 'address'
    | 'contactPhone'
    | 'contactEmail'
    | 'logoUrl'
    | 'estimatedAnnualRevenue'
    | 'status'
    | 'industry'
    | 'threatLevel'
    | 'isDirect'
  > & { accountName?: string | null; LegalEntity?: string | null; TradingName?: string | null }
): VisualiserMapPoint | null {
  if (!hasStoredCoordinates(competitor.latitude, competitor.longitude)) return null;
  const logo =
    resolveCompetitorLogoUrl(competitor.name, {
      accountName: competitor.accountName,
      legalEntity: competitor.LegalEntity,
      tradingName: competitor.TradingName,
    }) ||
    competitor.logoUrl?.trim() ||
    null;

  const revenue = formatMoney(competitor.estimatedAnnualRevenue);
  const rawRevenue =
    competitor.estimatedAnnualRevenue != null
      ? Number(competitor.estimatedAnnualRevenue)
      : null;
  const estimatedAnnualRevenue =
    rawRevenue != null && Number.isFinite(rawRevenue) ? rawRevenue : null;
  const brandKey = resolveHardwareBrand({
    name: competitor.name,
    accountName: competitor.accountName,
    LegalEntity: competitor.LegalEntity,
  });

  const highlights: VisualiserMapHighlight[] = [];
  if (revenue) {
    highlights.push({ label: 'Est. annual revenue', value: revenue });
  }
  if (competitor.threatLevel != null) {
    highlights.push({
      label: 'Threat level',
      value: String(competitor.threatLevel),
    });
  }
  if (competitor.industry) {
    highlights.push({ label: 'Industry', value: competitor.industry });
  }
  if (competitor.isDirect != null) {
    highlights.push({
      label: 'Direct rival',
      value: competitor.isDirect ? 'Yes' : 'No',
    });
  }

  return {
    id: `competitor-${competitor.uid}`,
    layer: 'competitors',
    name: competitor.name,
    latitude: Number(competitor.latitude),
    longitude: Number(competitor.longitude),
    logoUrl: logo,
    address: formatAddressLine(competitor.address),
    phone: competitor.contactPhone ?? null,
    email: competitor.contactEmail ?? null,
    metricLabel: 'Est. annual revenue',
    metricValue: revenue,
    highlights,
    positionLabel: competitor.industry ?? 'Competitor',
    status: competitor.status ?? null,
    subtitle:
      competitor.threatLevel != null
        ? `Threat level ${competitor.threatLevel}`
        : 'Mapped competitor location',
    competitorUid: competitor.uid,
    brandKey,
    estimatedAnnualRevenue,
  };
}

export function clientToMapPoint(client: ClientListItem): VisualiserMapPoint | null {
  const lat = client.latitude as number | string | null | undefined;
  const lng = client.longitude as number | string | null | undefined;
  if (!hasStoredCoordinates(lat, lng)) return null;

  const revenue =
    formatMoney(client.annualRevenue) ??
    formatMoney(client.lifetimeValue) ??
    formatMoney(client.outstandingBalance);
  const metricLabel = client.annualRevenue
    ? 'Annual revenue'
    : client.lifetimeValue
      ? 'Lifetime value'
      : client.outstandingBalance
        ? 'Outstanding balance'
        : null;

  const branchName =
    typeof client.branch === 'object' && client.branch != null
      ? getBranchDisplayLabel(client.branch as BranchListItem) ||
        (client.branch as { name?: string }).name
      : null;

  const rep =
    typeof client.assignedSalesRep === 'object' && client.assignedSalesRep != null
      ? (client.assignedSalesRep as { name?: string; surname?: string }).name
      : null;

  const highlights: VisualiserMapHighlight[] = [];
  if (revenue && metricLabel) {
    highlights.push({ label: metricLabel, value: revenue });
  }
  if (client.category) {
    highlights.push({ label: 'Category', value: String(client.category) });
  }
  if (client.industry) {
    highlights.push({ label: 'Industry', value: String(client.industry) });
  }
  if (client.creditLimit != null && client.creditLimit !== '') {
    const credit = formatMoney(client.creditLimit);
    if (credit) highlights.push({ label: 'Credit limit', value: credit });
  }
  if (client.outstandingBalance != null && client.outstandingBalance !== '') {
    const outstanding = formatMoney(client.outstandingBalance);
    if (outstanding && metricLabel !== 'Outstanding balance') {
      highlights.push({ label: 'Outstanding', value: outstanding });
    }
  }

  return {
    id: `client-${client.uid}`,
    layer: 'clients',
    name: client.name,
    latitude: Number(lat),
    longitude: Number(lng),
    logoUrl: typeof client.logo === 'string' ? client.logo : null,
    address: formatAddressLine(client.address),
    contact: client.contactPerson ?? null,
    phone: client.phone ?? null,
    email: client.email ?? null,
    metricLabel,
    metricValue: revenue,
    highlights,
    branchLabel: branchName ?? null,
    positionLabel: rep ? `Rep: ${rep}` : (client.category as string) ?? 'Competitor',
    status: client.status ?? null,
    subtitle: 'Competitor location',
  };
}

export function repLocationToMapPoint(loc: LatestRepLocation): VisualiserMapPoint | null {
  if (!hasStoredCoordinates(loc.latitude, loc.longitude)) return null;
  const fullName = [loc.user.name, loc.user.surname].filter(Boolean).join(' ').trim();
  return {
    id: `rep-${loc.user.uid}`,
    layer: 'reps',
    name: fullName || loc.user.email || `Rep #${loc.user.uid}`,
    latitude: Number(loc.latitude),
    longitude: Number(loc.longitude),
    logoUrl: loc.user.photoURL || loc.user.avatar || null,
    address: loc.address ?? null,
    email: loc.user.email ?? null,
    positionLabel: 'Sales rep',
    subtitle: 'Last known phone GPS',
    recordedAt: loc.recordedAt,
  };
}

export function pointsToGeoJSON(
  points: VisualiserMapPoint[]
): GeoJSON.FeatureCollection<GeoJSON.Point, VisualiserMapPoint> {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      id: p.id,
      properties: p,
      geometry: {
        type: 'Point',
        coordinates: [p.longitude, p.latitude],
      },
    })),
  };
}

export const LAYER_META: Record<
  VisualiserLayerId,
  { label: string; color: string; description: string }
> = {
  branches: {
    label: 'Branches',
    color: '#0d9488',
    description: 'Company branch locations',
  },
  hq: {
    label: 'HQ',
    color: '#b45309',
    description: 'Headquarters (branch logo + green border)',
  },
  clients: {
    label: 'Clients',
    color: '#2563eb',
    description: 'Client locations (handshake icons)',
  },
  competitors: {
    label: 'Competitors',
    color: '#dc2626',
    description: 'Competitor store locations (brand logos)',
  },
  reps: {
    label: 'Sales reps',
    color: '#7c3aed',
    description: 'Last known phone GPS (profile avatar)',
  },
};
