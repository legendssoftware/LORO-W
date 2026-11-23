import type { HardwareBrandKey } from '@/api/types/site-opportunity';
import {
  brandTurnoverZAR,
  resolveHardwareBrand,
} from '@/lib/site-opportunity/compute/brands';

/** Excel SUMMARY sheet order — direct (SCD) brands. */
export const MARKET_ANALYSIS_DIRECT_ORDER: HardwareBrandKey[] = [
  'FB MART',
  'SOLID CEILING',
  'OWA',
  'PELICAN',
  'CAPCO',
  'CDS',
  'SUPERTEC',
  'UBS',
];

/** Excel SUMMARY sheet order — indirect (hardwares) brands. */
export const MARKET_ANALYSIS_INDIRECT_ORDER: HardwareBrandKey[] = [
  'BOXER BUILD',
  'POWERBUILD',
  'EST',
  'CASHBUILD',
  'BUILDERS',
  'BUILD IT',
  'BUCO',
];

const DIRECT_BRAND_SET = new Set<HardwareBrandKey>(MARKET_ANALYSIS_DIRECT_ORDER);

export type MarketAnalysisCompetitorInput = {
  name: string;
  accountName?: string | null;
  LegalEntity?: string | null;
  TradingName?: string | null;
  isDirect?: boolean | null;
};

export type MarketAnalysisBrandRow = {
  competition: 'DIRECT' | 'INDIRECT';
  brand: HardwareBrandKey;
  description: string;
  qty: number;
  turnoverAll: number;
  monthlyAverage: number;
  monthly5: number;
  monthly20: number;
  fullYear5: number;
  fullYear20: number;
};

export type MarketAnalysisSection = {
  rows: MarketAnalysisBrandRow[];
  totals: MarketAnalysisBrandRow;
};

export type MarketAnalysisRollupRow = {
  label: string;
  qty: number;
  /** Matches Excel D24/D25 (cross-wired annual pool). */
  amount: number;
  share: number;
};

export type MarketAnalysisSummary = {
  direct: MarketAnalysisSection;
  indirect: MarketAnalysisSection;
  /** SCD / HARDWARES / TOTALS block (Excel rows 24–26). */
  rollup: {
    scd: MarketAnalysisRollupRow;
    hardwares: MarketAnalysisRollupRow;
    totals: MarketAnalysisRollupRow;
    months: number;
    hardwaresFullYear5: number;
    hardwaresFullYear20: number;
  };
  competitorCount: number;
  monthlyPool: number;
};

export function marketAnalysisDescription(brand: HardwareBrandKey): string {
  if (brand === 'BUILDERS') return 'BUILDERS WAREHOUSE';
  if (brand === 'OTHER') return 'OTHER';
  if (brand === 'P&L HARDWARE') return 'P&L HARDWARE';
  return brand;
}

function emptyTotals(
  competition: 'DIRECT' | 'INDIRECT',
): MarketAnalysisBrandRow {
  return {
    competition,
    brand: 'OTHER',
    description: 'Totals',
    qty: 0,
    turnoverAll: 0,
    monthlyAverage: 0,
    monthly5: 0,
    monthly20: 0,
    fullYear5: 0,
    fullYear20: 0,
  };
}

function sumSection(
  competition: 'DIRECT' | 'INDIRECT',
  rows: MarketAnalysisBrandRow[],
): MarketAnalysisBrandRow {
  const totals = emptyTotals(competition);
  for (const row of rows) {
    totals.qty += row.qty;
    totals.turnoverAll += row.turnoverAll;
    totals.monthly5 += row.monthly5;
    totals.monthly20 += row.monthly20;
    totals.fullYear5 += row.fullYear5;
    totals.fullYear20 += row.fullYear20;
  }
  totals.monthlyAverage =
    totals.qty > 0 ? totals.turnoverAll / totals.qty : 0;
  return totals;
}

function buildDirectRow(
  brand: HardwareBrandKey,
  qty: number,
): MarketAnalysisBrandRow {
  const monthlyAverage = brandTurnoverZAR(brand);
  const turnoverAll = monthlyAverage * qty;
  const monthly5 = monthlyAverage * 0.05;
  const monthly20 = monthlyAverage * 0.2;
  return {
    competition: 'DIRECT',
    brand,
    description: marketAnalysisDescription(brand),
    qty,
    turnoverAll,
    monthlyAverage,
    monthly5,
    monthly20,
    fullYear5: monthly5 * 12,
    fullYear20: monthly20 * 12,
  };
}

function buildIndirectRow(
  brand: HardwareBrandKey,
  qty: number,
): MarketAnalysisBrandRow {
  const monthlyAverage = brandTurnoverZAR(brand);
  const turnoverAll = monthlyAverage * qty;
  const monthly5 = monthlyAverage * 0.05;
  const monthly20 = monthlyAverage * 0.2;
  return {
    competition: 'INDIRECT',
    brand,
    description: marketAnalysisDescription(brand),
    qty,
    turnoverAll,
    monthlyAverage,
    monthly5,
    monthly20,
    // Excel HARDWARES "FULL YEAR" columns are monthly % × qty (not × 12).
    fullYear5: monthly5 * qty,
    fullYear20: monthly20 * qty,
  };
}

function isDirectCompetitor(
  input: MarketAnalysisCompetitorInput,
  brand: HardwareBrandKey,
): boolean {
  if (input.isDirect === true) return true;
  if (input.isDirect === false) return false;
  return DIRECT_BRAND_SET.has(brand);
}

/**
 * Build MARKET ANALYSIS SUMMARY tables from the live competitor catalog.
 * Formulas mirror the SUMMARY sheet in MARKET ANALYSIS SUMMARY.xlsx.
 */
export function buildMarketAnalysisSummary(
  competitors: MarketAnalysisCompetitorInput[],
): MarketAnalysisSummary {
  const directQty = new Map<HardwareBrandKey, number>();
  const indirectQty = new Map<HardwareBrandKey, number>();

  for (const brand of MARKET_ANALYSIS_DIRECT_ORDER) directQty.set(brand, 0);
  for (const brand of MARKET_ANALYSIS_INDIRECT_ORDER) indirectQty.set(brand, 0);

  for (const competitor of competitors) {
    const brand = resolveHardwareBrand({
      name: competitor.name,
      accountName: competitor.accountName,
      LegalEntity: competitor.LegalEntity,
    });
    if (isDirectCompetitor(competitor, brand)) {
      if (!DIRECT_BRAND_SET.has(brand)) continue;
      directQty.set(brand, (directQty.get(brand) ?? 0) + 1);
      continue;
    }
    if (brand === 'OTHER' || brand === 'P&L HARDWARE') {
      indirectQty.set(brand, (indirectQty.get(brand) ?? 0) + 1);
      continue;
    }
    indirectQty.set(brand, (indirectQty.get(brand) ?? 0) + 1);
  }

  const directRows = MARKET_ANALYSIS_DIRECT_ORDER.map((brand) =>
    buildDirectRow(brand, directQty.get(brand) ?? 0),
  ).filter((row) => row.qty > 0);

  const indirectKnown = MARKET_ANALYSIS_INDIRECT_ORDER.map((brand) =>
    buildIndirectRow(brand, indirectQty.get(brand) ?? 0),
  ).filter((row) => row.qty > 0);

  const extraIndirect: MarketAnalysisBrandRow[] = [];
  for (const [brand, qty] of indirectQty.entries()) {
    if (qty <= 0) continue;
    if (
      MARKET_ANALYSIS_INDIRECT_ORDER.includes(brand) ||
      DIRECT_BRAND_SET.has(brand)
    ) {
      continue;
    }
    extraIndirect.push(buildIndirectRow(brand, qty));
  }
  extraIndirect.sort((a, b) => b.qty - a.qty || a.description.localeCompare(b.description));

  const indirectRows = [...indirectKnown, ...extraIndirect];
  const directTotals = sumSection('DIRECT', directRows);
  const indirectTotals = sumSection('INDIRECT', indirectRows);

  // Excel rows 24–25 intentionally cross-wire annual amounts:
  // SCD amount = hardwares monthly × 12; HARDWARES amount = direct monthly × 12.
  const scdAmount = indirectTotals.turnoverAll * 12;
  const hardwaresAmount = directTotals.turnoverAll * 12;
  const rollupTotalAmount = scdAmount + hardwaresAmount;
  const rollupTotalQty = directTotals.qty + indirectTotals.qty;

  return {
    direct: { rows: directRows, totals: directTotals },
    indirect: { rows: indirectRows, totals: indirectTotals },
    rollup: {
      scd: {
        label: 'SCD - SPECIALIST CEILING DISTRIBUTOR',
        qty: directTotals.qty,
        amount: scdAmount,
        share: rollupTotalAmount > 0 ? scdAmount / rollupTotalAmount : 0,
      },
      hardwares: {
        label: 'HARDWARES',
        qty: indirectTotals.qty,
        amount: hardwaresAmount,
        share: rollupTotalAmount > 0 ? hardwaresAmount / rollupTotalAmount : 0,
      },
      totals: {
        label: 'TOTALS',
        qty: rollupTotalQty,
        amount: rollupTotalAmount,
        share: 1,
      },
      months: 12,
      hardwaresFullYear5: indirectTotals.fullYear5 * 12,
      hardwaresFullYear20: indirectTotals.fullYear20 * 12,
    },
    competitorCount: competitors.length,
    monthlyPool: directTotals.turnoverAll + indirectTotals.turnoverAll,
  };
}

/** Excel-style thousands separator (spaces). */
export function formatMarketAnalysisNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  const rounded =
    digits > 0
      ? Number(value.toFixed(digits))
      : Math.round(value);
  const fixed = digits > 0 ? rounded.toFixed(digits) : String(rounded);
  const [intPart, frac] = fixed.split('.');
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return frac != null ? `${withSpaces}.${frac}` : withSpaces;
}

export function formatMarketAnalysisPercent(share: number): string {
  if (!Number.isFinite(share)) return '0%';
  return `${Math.round(share * 100)}%`;
}
