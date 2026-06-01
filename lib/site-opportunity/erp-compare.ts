import type { BranchCatchmentOpportunity } from './types';

/** Map ERP store code (e.g. "015") to branch marker id from ref/alias/name. */
export function extractStoreCodeFromBranchMarker(marker: {
  ref?: unknown;
  alias?: unknown;
  name?: unknown;
}): string | null {
  const candidates = [marker.ref, marker.alias, marker.name]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());

  for (const c of candidates) {
    const leadingNum = /^(\d+)\s/.exec(c);
    if (leadingNum?.[1]) return leadingNum[1].padStart(3, '0');

    const bitMatch = /bit\s*(\d+)/i.exec(c);
    if (bitMatch?.[1]) return bitMatch[1].padStart(3, '0');

    const bMatch = /^B(\d+)/i.exec(c);
    if (bMatch?.[1]) return bMatch[1].padStart(3, '0');

    const digits = c.replace(/\D/g, '');
    if (digits.length >= 1 && digits.length <= 4) return digits.padStart(3, '0');
  }
  return null;
}

export interface BranchPerformanceRow {
  store: string;
  totalRevenue?: number;
  label?: string;
}

/** Build branch id → annual revenue from performance dashboard branchPerformance rows. */
export function buildBranchRevenueMap(
  branches: Array<{ id: string | number; ref?: unknown; alias?: unknown; name?: unknown }>,
  performanceRows: BranchPerformanceRow[]
): Map<string, number> {
  const byStore = new Map<string, number>();
  for (const row of performanceRows) {
    const code = row.store?.replace(/^B/i, '').padStart(3, '0');
    if (code && row.totalRevenue != null) {
      byStore.set(code, row.totalRevenue);
    }
  }

  const out = new Map<string, number>();
  for (const b of branches) {
    const code = extractStoreCodeFromBranchMarker(b);
    if (!code) continue;
    const rev = byStore.get(code);
    if (rev != null) out.set(String(b.id), rev);
  }
  return out;
}

export function attachRevenueGap(
  catchments: BranchCatchmentOpportunity[]
): BranchCatchmentOpportunity[] {
  return catchments.map((c) => ({
    ...c,
    revenueGapZAR:
      c.actualRevenueZAR != null
        ? c.potentialHighZAR - c.actualRevenueZAR
        : c.revenueGapZAR ?? null,
  }));
}
