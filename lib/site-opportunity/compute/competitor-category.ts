import type { MapMarkerBase } from '@/api/types/map';
import type { BrandCount, CategoryCount, HardwareBrandKey } from '@/api/types/site-opportunity';
import { resolveHardwareBrand } from '@/lib/site-opportunity/compute/brands';

export type CompetitorCategoryKey = 'retailer' | 'sd';

export const RETAILER_BRANDS: readonly HardwareBrandKey[] = [
  'BUCO',
  'CASHBUILD',
  'BUILD IT',
  'BUILDERS',
  'POWERBUILD',
  'EST',
] as const;

export const SD_BRANDS: readonly HardwareBrandKey[] = [
  'P&L HARDWARE',
  'OTHER',
] as const;

export const CATEGORY_LABELS: Record<CompetitorCategoryKey, string> = {
  retailer: 'Retailers',
  sd: 'SDs',
};

export function resolveCompetitorCategory(
  brand: HardwareBrandKey,
): CompetitorCategoryKey {
  if ((SD_BRANDS as readonly string[]).includes(brand)) return 'sd';
  return 'retailer';
}

export function countByCategoryFromBrandCounts(
  byBrand: BrandCount[],
): CategoryCount[] {
  const totals = new Map<CompetitorCategoryKey, { count: number; turnoverZAR: number }>();
  for (const row of byBrand) {
    const category = resolveCompetitorCategory(row.brand);
    const prev = totals.get(category) ?? { count: 0, turnoverZAR: 0 };
    totals.set(category, {
      count: prev.count + row.count,
      turnoverZAR: prev.turnoverZAR + row.turnoverZAR,
    });
  }
  return (['retailer', 'sd'] as const)
    .map((category) => {
      const row = totals.get(category);
      return {
        category,
        count: row?.count ?? 0,
        turnoverZAR: row?.turnoverZAR ?? 0,
      };
    })
    .filter((row) => row.count > 0);
}

export function countByCategory(markers: MapMarkerBase[]): CategoryCount[] {
  const counts = new Map<CompetitorCategoryKey, number>();
  for (const marker of markers) {
    const brand = resolveHardwareBrand(marker);
    const category = resolveCompetitorCategory(brand);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return (['retailer', 'sd'] as const)
    .map((category) => ({
      category,
      count: counts.get(category) ?? 0,
      turnoverZAR: 0,
    }))
    .filter((row) => row.count > 0);
}
