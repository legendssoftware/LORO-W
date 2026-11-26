import type {
  BrandCount,
  HardwareBrandKey,
  SiteOpportunityZone,
  TurnoverOverrideSettings,
} from '@/api/types/site-opportunity';
import { brandTurnoverZAR } from '@/lib/site-opportunity/compute/brands';
import {
  countByCategoryFromBrandCounts,
  resolveCompetitorCategory,
} from '@/lib/site-opportunity/compute/competitor-category';
import {
  buildCaptureTimeline,
  monthsToTargetMid,
} from '@/lib/site-opportunity/compute/capture-phases';

function effectiveBrandTurnover(
  brand: HardwareBrandKey,
  overrides: TurnoverOverrideSettings,
): number {
  const category = resolveCompetitorCategory(brand);
  const categoryOverride = overrides.categoryTurnoverOverrides?.[category];
  if (categoryOverride != null && Number.isFinite(categoryOverride) && categoryOverride > 0) {
    return categoryOverride;
  }
  const brandOverride = overrides.brandTurnoverOverrides?.[brand];
  if (brandOverride != null && Number.isFinite(brandOverride) && brandOverride > 0) {
    return brandOverride;
  }
  return brandTurnoverZAR(brand);
}

function rebuildByBrand(
  byBrand: BrandCount[],
  overrides: TurnoverOverrideSettings,
): BrandCount[] {
  return byBrand
    .map((row) => ({
      ...row,
      turnoverZAR: row.count * effectiveBrandTurnover(row.brand, overrides),
    }))
    .sort((a, b) => b.turnoverZAR - a.turnoverZAR);
}

function hasOverrides(overrides?: TurnoverOverrideSettings): boolean {
  if (!overrides) return false;
  const brandKeys = Object.keys(overrides.brandTurnoverOverrides ?? {});
  const categoryKeys = Object.keys(overrides.categoryTurnoverOverrides ?? {});
  return brandKeys.length > 0 || categoryKeys.length > 0;
}

/** Recompute pool, potential, timeline, and brand rows with client-side turnover overrides. */
export function applyTurnoverOverridesToZone<T extends SiteOpportunityZone>(
  zone: T,
  captureLowPct: number,
  captureHighPct: number,
  overrides?: TurnoverOverrideSettings,
  options?: { revenuePerSqmMonthlyZAR?: number },
): T {
  if (!hasOverrides(overrides)) return zone;

  const byBrand = rebuildByBrand(zone.byBrand, overrides ?? {});
  const addressablePoolZAR = byBrand.reduce((sum, row) => sum + row.turnoverZAR, 0);
  const marketPotentialLowZAR = addressablePoolZAR * captureLowPct;
  const marketPotentialHighZAR = addressablePoolZAR * captureHighPct;

  let potentialLowZAR = marketPotentialLowZAR;
  let potentialHighZAR = marketPotentialHighZAR;
  let capacityCeilingZAR: number | null | undefined;

  if (zone.kind === 'catchment') {
    const floorSizeSqm = zone.floorSizeSqm ?? null;
    const rate = options?.revenuePerSqmMonthlyZAR;
    if (
      floorSizeSqm != null &&
      Number.isFinite(floorSizeSqm) &&
      floorSizeSqm > 0 &&
      rate != null &&
      Number.isFinite(rate) &&
      rate > 0
    ) {
      capacityCeilingZAR = floorSizeSqm * rate;
      potentialLowZAR = Math.min(marketPotentialLowZAR, capacityCeilingZAR);
      potentialHighZAR = Math.min(marketPotentialHighZAR, capacityCeilingZAR);
    } else if (
      zone.capacityCeilingZAR != null &&
      Number.isFinite(zone.capacityCeilingZAR) &&
      zone.capacityCeilingZAR > 0
    ) {
      capacityCeilingZAR = zone.capacityCeilingZAR;
      potentialLowZAR = Math.min(marketPotentialLowZAR, capacityCeilingZAR);
      potentialHighZAR = Math.min(marketPotentialHighZAR, capacityCeilingZAR);
    }
  }

  const byCategory = countByCategoryFromBrandCounts(byBrand);
  const captureTimeline = buildCaptureTimeline(potentialLowZAR, potentialHighZAR);

  if (zone.kind === 'catchment') {
    const revenueGapZAR =
      zone.actualRevenueZAR != null ? potentialHighZAR - zone.actualRevenueZAR : null;
    return {
      ...zone,
      byBrand,
      byCategory,
      addressablePoolZAR,
      potentialLowZAR,
      potentialHighZAR,
      ...(capacityCeilingZAR !== undefined ? { capacityCeilingZAR } : {}),
      revenueGapZAR,
      opportunityScore: revenueGapZAR ?? addressablePoolZAR,
      captureTimeline,
      monthsToTargetMid: monthsToTargetMid(potentialLowZAR, potentialHighZAR),
    };
  }

  const scoreRatio =
    zone.addressablePoolZAR > 0 ? addressablePoolZAR / zone.addressablePoolZAR : 1;

  return {
    ...zone,
    byBrand,
    byCategory,
    addressablePoolZAR,
    potentialLowZAR,
    potentialHighZAR,
    opportunityScore:
      zone.addressablePoolZAR > 0
        ? zone.opportunityScore * scoreRatio
        : addressablePoolZAR,
    captureTimeline,
    monthsToTargetMid: monthsToTargetMid(potentialLowZAR, potentialHighZAR),
  };
}
