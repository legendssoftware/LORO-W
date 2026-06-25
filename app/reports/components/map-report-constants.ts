import { Flame, Landmark, ShoppingBag, Store, type LucideIcon } from 'lucide-react';
import type { MapMarkerBase } from '@/api/types/map';
import type { HardwareBrandKey } from '@/api/types/site-opportunity';

/** Palette for map marker rings, influence spheres, and legend (aligned with reports visualiser). */
export const MARKER_COLORS: Record<string, string> = {
  'check-in': '#2563eb',
  'shift-start': '#0d9488',
  'shift-end': '#ea580c',
  'break-start': '#a855f7',
  'break-end': '#7c3aed',
  client: '#16a34a',
  competitor: '#dc2626',
  lead: '#9333ea',
  'check-in-visit': '#0891b2',
  branch: '#854d0e',
  org: '#2563eb',
  task: '#ca8a04',
  journal: '#64748b',
  quotation: '#db2777',
  claim: '#b45309',
};

/** Map marker background colors by hardware brand (mirrors server brands.ts). */
export const HARDWARE_BRAND_MARKER_COLORS: Record<HardwareBrandKey, string> = {
  BUCO: '#f59e0b',
  CASHBUILD: '#dc2626',
  'BUILD IT': '#dc2626',
  POWERBUILD: '#dc2626',
  EST: '#dc2626',
  'P&L HARDWARE': '#dc2626',
  OTHER: '#dc2626',
};

const BRAND_ALIASES: Record<string, HardwareBrandKey> = {
  BUCO: 'BUCO',
  CASHBUILD: 'CASHBUILD',
  'BUILD IT': 'BUILD IT',
  BUILDIT: 'BUILD IT',
  POWERBUILD: 'POWERBUILD',
  EST: 'EST',
  'EST STORES': 'EST',
  'P&L HARDWARE': 'P&L HARDWARE',
  'P&L': 'P&L HARDWARE',
};

function normalizeBrandToken(raw: string): HardwareBrandKey {
  const upper = raw.trim().toUpperCase();
  if (BRAND_ALIASES[upper]) return BRAND_ALIASES[upper];
  for (const [key, value] of Object.entries(BRAND_ALIASES)) {
    if (upper.startsWith(key)) return value;
  }
  return 'OTHER';
}

function resolveHardwareBrandFromMarker(marker: MapMarkerBase): HardwareBrandKey {
  const fromApi = marker.hardwareBrand;
  if (typeof fromApi === 'string' && fromApi.trim()) {
    return normalizeBrandToken(fromApi);
  }

  const accountName = marker.accountName ?? marker.LegalEntity;
  if (typeof accountName === 'string' && accountName.trim()) {
    return normalizeBrandToken(accountName);
  }

  const name = String(marker.name ?? '').trim();
  const dashIdx = name.indexOf(' – ');
  const hyphenIdx = name.indexOf(' - ');
  const splitIdx =
    dashIdx >= 0 && hyphenIdx >= 0
      ? Math.min(dashIdx, hyphenIdx)
      : Math.max(dashIdx, hyphenIdx);
  if (splitIdx > 0) {
    return normalizeBrandToken(name.slice(0, splitIdx));
  }

  return normalizeBrandToken(name);
}

export function resolveCompetitorMarkerColor(marker: MapMarkerBase): string {
  const fromApi = marker.markerColor;
  if (typeof fromApi === 'string' && fromApi.trim()) {
    return fromApi.trim();
  }
  const brand = resolveHardwareBrandFromMarker(marker);
  return HARDWARE_BRAND_MARKER_COLORS[brand] ?? MARKER_COLORS.competitor;
}

export type MapEntityMarkerType = 'client' | 'competitor' | 'branch' | 'org';

export const MAP_ENTITY_MARKERS: Record<
  MapEntityMarkerType,
  { bg: string; Icon: LucideIcon }
> = {
  client: { bg: MARKER_COLORS.client, Icon: ShoppingBag },
  competitor: { bg: MARKER_COLORS.competitor, Icon: Flame },
  branch: { bg: MARKER_COLORS.branch, Icon: Store },
  org: { bg: MARKER_COLORS.org, Icon: Landmark },
};

/** @deprecated Prefer MAP_ENTITY_MARKERS */
export const ORG_SITE_MAP_MARKER: Record<
  'client' | 'competitor',
  { bg: string; Icon: LucideIcon }
> = {
  client: MAP_ENTITY_MARKERS.client,
  competitor: MAP_ENTITY_MARKERS.competitor,
};

export const MAP_ENTITY_MARKER_SIZE = 30;

/** @deprecated Prefer MAP_ENTITY_MARKER_SIZE */
export const ORG_SITE_MARKER_SIZE = MAP_ENTITY_MARKER_SIZE;

export const CLUSTER_MARKER_BG = '#475569';

export const MARKER_TYPE_LABELS: Record<string, string> = {
  'check-in': 'Active check-in',
  'shift-start': 'Shift start',
  'shift-end': 'Shift end',
  'break-start': 'Break start',
  'break-end': 'Break end',
  client: 'Client',
  competitor: 'Competitor',
  lead: 'Lead',
  'check-in-visit': 'Visit (check-in)',
  branch: 'Branch',
  org: 'Organisation HQ',
  task: 'Task',
  journal: 'Journal',
  quotation: 'Quotation (sales)',
  claim: 'Claim',
};

export function markerTypeLabel(markerType: string): string {
  return MARKER_TYPE_LABELS[markerType] ?? markerType;
}

export function influenceColorForKind(kind: string): string {
  return MARKER_COLORS[kind] ?? '#64748b';
}
