import type {
  BrandCount,
  CaptureTimelinePoint,
  HardwareBrandKey,
  SiteOpportunityZone,
  TurnoverOverrideSettings,
} from '@/api/types/site-opportunity';
import { brandTurnoverZAR } from '@/lib/site-opportunity/compute/brands';
import {
  countByCategoryFromBrandCounts,
  resolveCompetitorCategory,
} from '@/lib/site-opportunity/compute/competitor-category';

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

function rebuildCaptureTimeline(
  potentialLowZAR: number,
  potentialHighZAR: number,
  existing: CaptureTimelinePoint[],
): CaptureTimelinePoint[] {
  if (existing.length === 0) return existing;
  const potentialMidZAR = (potentialLowZAR + potentialHighZAR) / 2;
  return existing.map((point) => ({
    ...point,
    revenueLowZAR: potentialLowZAR * point.captureMidPct,
    revenueMidZAR: potentialMidZAR * point.captureMidPct,
    revenueHighZAR: potentialHighZAR * point.captureMidPct,
  }));
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
): T {
  if (!hasOverrides(overrides)) return zone;

  const byBrand = rebuildByBrand(zone.byBrand, overrides ?? {});
  const addressablePoolZAR = byBrand.reduce((sum, row) => sum + row.turnoverZAR, 0);
  const potentialLowZAR = addressablePoolZAR * captureLowPct;
  const potentialHighZAR = addressablePoolZAR * captureHighPct;
  const byCategory = countByCategoryFromBrandCounts(byBrand);

  return {
    ...zone,
    byBrand,
    byCategory,
    addressablePoolZAR,
    potentialLowZAR,
    potentialHighZAR,
    captureTimeline: rebuildCaptureTimeline(
      potentialLowZAR,
      potentialHighZAR,
      zone.captureTimeline,
    ),
  };
}
