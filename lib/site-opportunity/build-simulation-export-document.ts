import type { MapMarkerBase } from '@/api/types/map';
import type {
  SiteOpportunityMode,
  SiteOpportunityResult,
  SiteOpportunitySettings,
  SiteOpportunityZone,
  TurnoverOverrideSettings,
} from '@/api/types/site-opportunity';
import { HARDWARE_TURNOVER_ZAR } from '@/lib/site-opportunity/compute/brands';
import { matureShareByCompetition } from '@/lib/site-opportunity/compute/capture-phases';
import {
  formatStoreFormatSizeRange,
  formatStoreFormatTurnoverRange,
  isStoreSizeSuggestionEnabled,
  suggestBitDrywallStoreFormat,
} from '@/lib/site-opportunity/bitdrywall-store-formats';
import { buildTurnoverSimulation } from '@/lib/site-opportunity/turnover-simulation';
import { getCompetitorsInZoneByBrand } from '@/lib/site-opportunity/zone-competitors';
import { currentMonthLabel } from '@/lib/utils/sales-per-store-match';
import {
  SIMULATION_EXPORT_DISCLAIMER,
  type SimulationExportDocument,
  type SimulationExportSettings,
  type SimulationExportZone,
} from '@/lib/site-opportunity/simulation-export-types';

const ALL_SCOPE = 'all';

const ASSUMPTION_BRANDS = [
  'BUCO',
  'CASHBUILD',
  'BUILD IT',
  'BUILDERS',
  'POWERBUILD',
  'EST',
] as const;

export interface SimulationExportRunFilters {
  country: string;
  province: string;
  mode: SiteOpportunityMode;
}

export interface BuildSimulationExportDocumentInput {
  result: SiteOpportunityResult;
  runMarkers: MapMarkerBase[];
  runFilters: SimulationExportRunFilters | null;
  runTurnoverOverrides: TurnoverOverrideSettings | null;
  organisationName: string | null;
  ranAtIso: string | null;
  erpMatchedStores: number;
  erpError: string | null;
  generatedAt?: Date;
}

function modeLabel(mode: SiteOpportunityMode): string {
  switch (mode) {
    case 'both':
      return 'Catchments and opportunities';
    case 'catchment':
      return 'Catchments';
    case 'greenfield':
      return 'Opportunities';
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function scopeCountryLabel(country: string | undefined): string {
  if (!country || country.trim().toLowerCase() === ALL_SCOPE) {
    return 'All countries';
  }
  return country;
}

function scopeProvinceLabel(province: string | undefined): string | null {
  if (!province || province.trim().toLowerCase() === ALL_SCOPE) return null;
  return province;
}

function zoneTitle(zone: SiteOpportunityZone): string {
  switch (zone.kind) {
    case 'catchment':
      return zone.branchName;
    case 'greenfield':
      return zone.label;
    default: {
      const _exhaustive: never = zone;
      return _exhaustive;
    }
  }
}

function buildSettings(
  settings: SiteOpportunitySettings,
  overrides: TurnoverOverrideSettings | null,
): SimulationExportSettings {
  const brandOverrides = overrides?.brandTurnoverOverrides ?? {};
  return {
    radiusKm: settings.radiusMeters / 1000,
    minBranchSeparationKm: settings.minBranchSeparationKm,
    captureLowPct: settings.captureLowPct,
    captureHighPct: settings.captureHighPct,
    topN: settings.topN,
    repTargetMonthlyZAR: settings.repTargetMonthlyZAR ?? null,
    revenuePerSqmMonthlyZAR: settings.revenuePerSqmMonthlyZAR ?? null,
    suggestStoreSizeFromTurnover: isStoreSizeSuggestionEnabled(
      settings.suggestStoreSizeFromTurnover,
    ),
    brandTurnovers: ASSUMPTION_BRANDS.map((brand) => {
      const override = brandOverrides[brand];
      const monthlyZAR =
        typeof override === 'number' && Number.isFinite(override) && override > 0
          ? override
          : HARDWARE_TURNOVER_ZAR[brand];
      return { brand, monthlyZAR };
    }),
  };
}

function mapZone(
  zone: SiteOpportunityZone,
  markers: MapMarkerBase[],
  settings: SiteOpportunitySettings,
  erpMonthLabel: string,
): SimulationExportZone {
  const showStoreFormat = isStoreSizeSuggestionEnabled(
    settings.suggestStoreSizeFromTurnover,
  );
  const sim = buildTurnoverSimulation(zone, {
    actualRevenueZAR: zone.kind === 'catchment' ? zone.actualRevenueZAR : null,
    actualRevenueMonthLabel: erpMonthLabel,
    repTargetMonthlyZAR: settings.repTargetMonthlyZAR,
  });
  const storeSuggestion = showStoreFormat
    ? suggestBitDrywallStoreFormat(sim.simulatedMonthlyZAR)
    : null;
  const competitorsByBrand = getCompetitorsInZoneByBrand(
    { lat: zone.lat, lng: zone.lng },
    zone.radiusMeters,
    markers,
  );
  const competitors = [...competitorsByBrand.entries()].flatMap(([brand, stores]) =>
    stores.map((store) => ({
      brand,
      name: store.name,
      address: store.address,
    })),
  );

  return {
    kind: zone.kind,
    rank: zone.rank,
    title: zoneTitle(zone),
    address: zone.address,
    lat: zone.lat,
    lng: zone.lng,
    radiusKm: zone.radiusMeters / 1000,
    clientCount: zone.clientCount,
    competitorCount: zone.competitorCount,
    competitionLabel: matureShareByCompetition(zone.competitorCount).label,
    addressablePoolZAR: zone.addressablePoolZAR,
    potentialLowZAR: zone.potentialLowZAR,
    potentialHighZAR: zone.potentialHighZAR,
    simulatedMonthlyZAR: sim.simulatedMonthlyZAR,
    actualMonthlyZAR: sim.actualMonthlyZAR ?? null,
    varianceZAR: sim.varianceZAR ?? null,
    variancePct: sim.variancePct ?? null,
    monthsToMature: zone.monthsToTargetMid,
    nearestBranchKm: zone.kind === 'greenfield' ? zone.nearestBranchKm : null,
    floorSizeSqm: zone.kind === 'catchment' ? (zone.floorSizeSqm ?? null) : null,
    capacityCeilingZAR:
      zone.kind === 'catchment' ? (zone.capacityCeilingZAR ?? null) : null,
    storeFormat: storeSuggestion
      ? {
          label: storeSuggestion.formatLabel,
          sizeSqm: storeSuggestion.suggestedSizeSqm,
          sizeRange: formatStoreFormatSizeRange(storeSuggestion),
          turnoverRange: formatStoreFormatTurnoverRange(storeSuggestion),
        }
      : null,
    brands: zone.byBrand.map((row) => ({
      brand: row.brand,
      count: row.count,
      turnoverZAR: row.turnoverZAR,
    })),
    competitors,
    milestones: sim.milestones.map((m) => ({
      label: m.label,
      month: m.month,
      lowZAR: m.lowMonthlyZAR,
      midZAR: m.midMonthlyZAR,
      highZAR: m.highMonthlyZAR,
    })),
    captureTimeline: zone.captureTimeline.map((point) => ({
      month: point.month,
      lowZAR: point.revenueLowZAR,
      midZAR: point.revenueMidZAR,
      highZAR: point.revenueHighZAR,
    })),
    productMix: sim.productMix.map((line) => ({
      category: line.category,
      pct: line.pct,
      monthlyZAR: line.monthlyZAR,
    })),
    repsRequired: sim.repsRequired ?? null,
  };
}

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a serializable briefing from the last visualiser simulation run.
 */
export function buildSimulationExportDocument(
  input: BuildSimulationExportDocumentInput,
): SimulationExportDocument {
  const generatedAt = input.generatedAt ?? new Date();
  const resolvedMode: SiteOpportunityMode = input.runFilters?.mode ?? 'both';
  const erpMonthLabel = currentMonthLabel(generatedAt);
  const catchments = input.result.catchments.map((zone) =>
    mapZone(
      zone,
      input.runMarkers,
      input.result.settings,
      erpMonthLabel,
    ),
  );
  const opportunities = input.result.greenfield.map((zone) =>
    mapZone(
      zone,
      input.runMarkers,
      input.result.settings,
      erpMonthLabel,
    ),
  );

  return {
    meta: {
      title: 'Store turnover simulation',
      organisationName: input.organisationName?.trim() || 'Organisation',
      generatedAtIso: generatedAt.toISOString(),
      ranAtIso: input.ranAtIso,
      countryLabel: scopeCountryLabel(input.runFilters?.country),
      provinceLabel: scopeProvinceLabel(input.runFilters?.province),
      modeLabel: modeLabel(resolvedMode),
      erpMonthLabel,
      erpMatchedStores: input.erpMatchedStores,
      erpError: input.erpError,
    },
    settings: buildSettings(input.result.settings, input.runTurnoverOverrides),
    dataQuality: input.result.dataQuality,
    warnings: input.result.warnings,
    catchments,
    opportunities,
    disclaimer: [...SIMULATION_EXPORT_DISCLAIMER],
  };
}

/** Download filename for a simulation briefing PDF. */
export function buildSimulationExportFilename(
  document: SimulationExportDocument,
  generatedAt = new Date(document.meta.generatedAtIso),
): string {
  const date = Number.isNaN(generatedAt.getTime())
    ? new Date()
    : generatedAt;
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const scope = [
    slugPart(document.meta.countryLabel),
    document.meta.provinceLabel
      ? slugPart(document.meta.provinceLabel)
      : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join('-');
  return `loro-simulation-${scope || 'all'}-${yyyy}-${mm}-${dd}.pdf`;
}
