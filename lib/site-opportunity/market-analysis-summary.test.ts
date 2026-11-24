import { describe, expect, it } from 'vitest';
import {
  buildMarketAnalysisSummary,
  formatMarketAnalysisNumber,
  formatMarketAnalysisPercent,
  formatMarketAnalysisZar,
} from '@/lib/site-opportunity/market-analysis-summary';

function expand(
  accountName: string,
  qty: number,
  isDirect: boolean,
): Array<{ name: string; accountName: string; isDirect: boolean }> {
  return Array.from({ length: qty }, (_, i) => ({
    name: `${accountName} ${i + 1}`,
    accountName,
    isDirect,
  }));
}

describe('buildMarketAnalysisSummary', () => {
  it('matches MARKET ANALYSIS SUMMARY.xlsx qty and turnover totals', () => {
    const competitors = [
      ...expand('FB MART', 1, true),
      ...expand('SOLID CEILING', 3, true),
      ...expand('OWA', 3, true),
      ...expand('PELICAN', 4, true),
      ...expand('CAPCO', 4, true),
      ...expand('CDS', 11, true),
      ...expand('SUPERTEC', 12, true),
      ...expand('UBS', 14, true),
      ...expand('BOXER BUILD', 29, false),
      ...expand('POWERBUILD', 912, false),
      ...expand('EST', 1015, false),
      ...expand('CASHBUILD', 318, false),
      ...expand('BUILDERS WAREHOUSE', 46, false),
      ...expand('BUILDERS EXPRESS', 66, false),
      ...expand('BUILDERS SUPERSTORE', 13, false),
      ...expand('BUILD IT', 389, false),
      ...expand('BUCO', 85, false),
    ];

    const summary = buildMarketAnalysisSummary(competitors);

    expect(summary.competitorCount).toBe(2925);
    expect(summary.direct.totals.qty).toBe(52);
    expect(summary.direct.totals.turnoverAll).toBe(123_600_000);
    expect(summary.indirect.totals.qty).toBe(2873);
    expect(summary.indirect.totals.turnoverAll).toBe(8_591_300_000);
    expect(summary.monthlyPool).toBe(8_714_900_000);

    expect(summary.rollup.scd.qty).toBe(52);
    expect(summary.rollup.scd.amount).toBe(103_095_600_000);
    expect(formatMarketAnalysisPercent(summary.rollup.scd.share)).toBe('99%');
    expect(summary.rollup.hardwares.qty).toBe(2873);
    expect(summary.rollup.hardwares.amount).toBe(1_483_200_000);
    expect(formatMarketAnalysisPercent(summary.rollup.hardwares.share)).toBe(
      '1%',
    );
    expect(summary.rollup.totals.qty).toBe(2925);
    expect(summary.rollup.totals.amount).toBe(104_578_800_000);

    const builders = summary.indirect.rows.find(
      (row) => row.description === 'BUILDERS WAREHOUSE',
    );
    expect(builders?.qty).toBe(125);
    expect(builders?.turnoverAll).toBe(350_000_000);
  });

  it('formats numbers with space thousands separators', () => {
    expect(formatMarketAnalysisNumber(4_200_000)).toBe('4 200 000');
    expect(formatMarketAnalysisNumber(8_591_300_000)).toBe('8 591 300 000');
  });

  it('formats ZAR amounts with an R prefix', () => {
    expect(formatMarketAnalysisZar(4_200_000)).toBe('R 4 200 000');
    expect(formatMarketAnalysisZar(Number.NaN)).toBe('—');
  });
});
