import type { MapMarkerBase } from '@/api/types/map';
import { ORG_BRANCH_PIN_URL } from '@/lib/leaflet/map-pin-constants';

/** Local 3D map-pin assets under `web/public/competitor/`. */
export const COMPETITOR_PIN_ASSETS = {
  bitdrywall: ORG_BRANCH_PIN_URL,
  buildit: '/competitor/buildit.png',
  buco: '/competitor/buco.png',
  builders: '/competitor/builders.png',
  builtmart: '/competitor/builtmart.png',
  capco: '/competitor/capco.png',
  cashbuild: '/competitor/cashbuild.png',
  cds: '/competitor/cds.png',
  lstafrica: '/competitor/lstafrica.png',
  pelicansystems: '/competitor/pelicansystems.png',
  powerbuild: '/competitor/powerbuild.png',
  solid: '/competitor/solid.png',
  supertec: '/competitor/supertec.png',
  ubs: '/competitor/ubs.png',
} as const;

export type CompetitorLogoSlug = keyof typeof COMPETITOR_PIN_ASSETS;

const LOCAL_MAP_PIN_PREFIX = '/competitor/';

export function isLocalMapPinAsset(url: string | undefined): boolean {
  return Boolean(url?.startsWith(LOCAL_MAP_PIN_PREFIX));
}

/** @deprecated Use isLocalMapPinAsset */
export const isCompetitorPinAsset = isLocalMapPinAsset;

export type CompetitorLogoInput = Pick<MapMarkerBase, 'name'> &
  Partial<Pick<MapMarkerBase, 'accountName' | 'LegalEntity' | 'logoUrl'>> & {
    alias?: string | null;
    TradingName?: string | null;
    brandStatus?: string | null;
  };

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Normalized haystack for brand token matching (mirrors docs/competitor_logo_seed.sql). */
export function normalizeCompetitorBrandHaystack(parts: Array<string | null | undefined>): string {
  const joined = parts
    .map((part) => readString(part))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[–—−\-_/]+/g, ' ')
    .replace(/[^a-z0-9& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return joined ? ` ${joined} ` : '';
}

/**
 * Resolve a local competitor pin slug from marker / list fields.
 * Match order matters: Powerbuild / Builders before Build it (all contain "build").
 */
export function resolveCompetitorLogoSlug(input: CompetitorLogoInput): CompetitorLogoSlug | null {
  const hay = normalizeCompetitorBrandHaystack([
    input.name,
    input.alias,
    input.accountName,
    input.LegalEntity,
    input.TradingName,
    input.brandStatus,
  ]);

  if (!hay.trim()) return null;

  if (/(^| )power ?build( |$)/.test(hay)) return 'powerbuild';
  if (/(^| )cash ?build( |$)/.test(hay)) return 'cashbuild';
  if (/(^| )buco( |$)/.test(hay)) return 'buco';
  if (
    /(^| )builders ?warehouse( |$)/.test(hay) ||
    /(^| )builderswarehouse( |$)/.test(hay) ||
    /(^| )builders ?express( |$)/.test(hay) ||
    /(^| )builders ?superstore( |$)/.test(hay) ||
    /(^| )builders ?trade ?depot( |$)/.test(hay) ||
    /(^| )bex( |$)/.test(hay)
  ) {
    return 'builders';
  }
  if (
    /(^| )p ?& ?l( |$)/.test(hay) ||
    /(^| )p and l( |$)/.test(hay) ||
    /(^| )pandl( |$)/.test(hay) ||
    /(^| )pnl( |$)/.test(hay)
  ) {
    return null;
  }
  if (/(^| )build ?it( |$)/.test(hay) || /(^| )buildit( |$)/.test(hay)) return 'buildit';
  if (/bitdrywall|bit drywall/.test(hay)) return 'bitdrywall';
  if (/build ?mart|builtmart|build-mart/.test(hay)) return 'builtmart';
  if (/capco/.test(hay)) return 'capco';
  if (/(^| )cds( |$)/.test(hay)) return 'cds';
  if (/lst ?africa|lstafrica/.test(hay)) return 'lstafrica';
  if (/pelican ?systems|pelicansystems/.test(hay)) return 'pelicansystems';
  if (/super ?tec|supertec/.test(hay)) return 'supertec';
  if (/(^| )ubs( |$)/.test(hay)) return 'ubs';
  if (/(^| )solid( |$)/.test(hay)) return 'solid';

  return null;
}

/** Local public path for a competitor map pin, or undefined when no asset matches. */
export function resolveCompetitorLogoUrl(input: CompetitorLogoInput): string | undefined {
  const slug = resolveCompetitorLogoSlug(input);
  if (!slug) return undefined;
  return COMPETITOR_PIN_ASSETS[slug];
}

export function resolveCompetitorLogoUrlFromMarker(marker: MapMarkerBase): string | undefined {
  return resolveCompetitorLogoUrl({
    name: marker.name,
    accountName: readString(marker.accountName) || undefined,
    LegalEntity: readString(marker.LegalEntity) || undefined,
    alias: readString(marker.alias) || undefined,
    TradingName: readString(marker.TradingName) || undefined,
    brandStatus: readString(marker.brandStatus) || undefined,
  });
}

/** Local pin asset for org HQ and branch markers. */
export function resolveOrgBranchPinUrl(marker: MapMarkerBase): string | undefined {
  const mt = String(marker.markerType ?? '');
  if (mt === 'org' || mt === 'branch') return ORG_BRANCH_PIN_URL;
  return undefined;
}

/** Resolve any local 3D map pin (competitor brand match, or org/branch bitdrywall). */
export function resolveMapPinUrl(marker: MapMarkerBase): string | undefined {
  return resolveCompetitorLogoUrlFromMarker(marker) ?? resolveOrgBranchPinUrl(marker);
}
