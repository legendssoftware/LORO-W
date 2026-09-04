import { describe, expect, it } from 'vitest';
import {
  BITDRYWALL_CALL_QUALITY_SCORECARD_VERSION,
  OLD_BITDRYWALL_METRIC_IDS,
  buildBitDrywallCallQualityTemplate,
  isLegacyBitDrywallDimensionSet,
  resolveOrganisationCallQualityConfig,
  scoringCallQualityDimensions,
} from './call-quality-types';

describe('call-quality scorecard upgrade', () => {
  it('returns the BitDrywall template when config is missing', () => {
    const resolved = resolveOrganisationCallQualityConfig(undefined);
    expect(resolved.dimensions.length).toBeGreaterThan(0);
    expect(resolved.scorecardVersion).toBe(BITDRYWALL_CALL_QUALITY_SCORECARD_VERSION);
    expect(resolved.dimensions.some((row) => row.id === 'correct_decision_maker')).toBe(true);
  });

  it('upgrades a v1 BitDrywall checklist to the weighted rubric', () => {
    const legacy = {
      productName: 'BitDrywall',
      dailyCallTarget: 60,
      autoCreateLead: true,
      reviewScoreThreshold: 50,
      dimensions: OLD_BITDRYWALL_METRIC_IDS.map((id) => ({
        id,
        label: id,
        type: 'boolean' as const,
      })),
    };
    const resolved = resolveOrganisationCallQualityConfig(legacy);
    expect(resolved.scorecardVersion).toBe(BITDRYWALL_CALL_QUALITY_SCORECARD_VERSION);
    expect(resolved.autoCreateLead).toBe(true);
    expect(resolved.reviewScoreThreshold).toBe(55);
    expect(resolved.dimensions.some((row) => row.id === 'correct_decision_maker')).toBe(true);
    expect(resolved.dimensions.some((row) => row.id === 'sales_opportunity')).toBe(false);
  });

  it('upgrades a v2 BitDrywall scorecard so intro and listening no longer affect overall', () => {
    const v2 = buildBitDrywallCallQualityTemplate();
    const saved = {
      ...v2,
      scorecardVersion: 2,
      dimensions: v2.dimensions.map((row) =>
        row.id === 'professional_introduction' || row.id === 'questioning_listening'
          ? { ...row, weight: 5, affectsScore: true }
          : row,
      ),
    };
    const resolved = resolveOrganisationCallQualityConfig(saved);
    expect(resolved.scorecardVersion).toBe(BITDRYWALL_CALL_QUALITY_SCORECARD_VERSION);
    expect(resolved.dimensions.find((row) => row.id === 'professional_introduction')?.affectsScore).toBe(false);
    expect(resolved.dimensions.find((row) => row.id === 'next_action')?.weight).toBe(15);
  });

  it('keeps a custom scorecard that is not the old default ID set', () => {
    const custom = {
      scorecardVersion: 1,
      dimensions: [{ id: 'custom_open', label: 'Custom open', type: 'boolean' as const, weight: 10 }],
    };
    const resolved = resolveOrganisationCallQualityConfig(custom);
    expect(resolved.dimensions).toHaveLength(1);
    expect(resolved.dimensions[0].id).toBe('custom_open');
  });

  it('treats empty and undefined dimension lists as not legacy', () => {
    expect(isLegacyBitDrywallDimensionSet(undefined)).toBe(false);
    expect(isLegacyBitDrywallDimensionSet([])).toBe(false);
  });

  it('scores only boolean and score metrics that affect the overall', () => {
    const scoring = scoringCallQualityDimensions(buildBitDrywallCallQualityTemplate());
    expect(scoring.every((row) => row.type === 'boolean' || row.type === 'score')).toBe(true);
    expect(scoring.some((row) => row.affectsScore === false)).toBe(false);
  });
});
