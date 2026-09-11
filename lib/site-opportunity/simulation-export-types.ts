import type { DataQualitySummary } from '@/api/types/site-opportunity';

export type SimulationExportKind = 'catchment' | 'greenfield';

export interface SimulationExportBrandTurnover {
  brand: string;
  monthlyZAR: number;
}

export interface SimulationExportMeta {
  title: string;
  organisationName: string;
  generatedAtIso: string;
  ranAtIso: string | null;
  countryLabel: string;
  provinceLabel: string | null;
  modeLabel: string;
  erpMonthLabel: string | null;
  erpMatchedStores: number;
  erpError: string | null;
}

export interface SimulationExportSettings {
  radiusKm: number;
  minBranchSeparationKm: number;
  captureLowPct: number;
  captureHighPct: number;
  topN: number;
  repTargetMonthlyZAR: number | null;
  revenuePerSqmMonthlyZAR: number | null;
  suggestStoreSizeFromTurnover: boolean;
  brandTurnovers: SimulationExportBrandTurnover[];
}

export interface SimulationExportCompetitor {
  brand: string;
  name: string;
  address: string | null;
}

export interface SimulationExportBrandMix {
  brand: string;
  count: number;
  turnoverZAR: number;
}

export interface SimulationExportMilestone {
  label: string;
  month: number;
  lowZAR: number;
  midZAR: number;
  highZAR: number;
}

export interface SimulationExportProductMix {
  category: string;
  pct: number;
  monthlyZAR: number;
}

export interface SimulationExportStoreFormat {
  label: string;
  sizeSqm: number;
  sizeRange: string;
  turnoverRange: string;
}

export interface SimulationExportTimelinePoint {
  month: number;
  lowZAR: number;
  midZAR: number;
  highZAR: number;
}

export interface SimulationExportZone {
  kind: SimulationExportKind;
  rank: number;
  title: string;
  address: string | null;
  lat: number;
  lng: number;
  radiusKm: number;
  clientCount: number;
  competitorCount: number;
  competitionLabel: string;
  addressablePoolZAR: number;
  potentialLowZAR: number;
  potentialHighZAR: number;
  simulatedMonthlyZAR: number;
  actualMonthlyZAR: number | null;
  varianceZAR: number | null;
  variancePct: number | null;
  monthsToMature: number | null;
  nearestBranchKm: number | null;
  floorSizeSqm: number | null;
  capacityCeilingZAR: number | null;
  storeFormat: SimulationExportStoreFormat | null;
  brands: SimulationExportBrandMix[];
  competitors: SimulationExportCompetitor[];
  milestones: SimulationExportMilestone[];
  captureTimeline: SimulationExportTimelinePoint[];
  productMix: SimulationExportProductMix[];
  repsRequired: number | null;
}

export interface SimulationExportDocument {
  meta: SimulationExportMeta;
  settings: SimulationExportSettings;
  dataQuality: DataQualitySummary;
  warnings: string[];
  catchments: SimulationExportZone[];
  opportunities: SimulationExportZone[];
  disclaimer: string[];
}

/** Cover legal copy — one paragraph, not a forecast or investment recommendation. */
export const SIMULATION_EXPORT_LEGAL_DISCLAIMER =
  'This is a simulation of mapped data for ranking and planning. It is not an AI forecast, guaranteed revenue, site fitness, or investment advice. Visit candidate sites, verify local conditions, and complete independent due diligence before lease or capital decisions. LORO is not liable for losses from acting solely on these results.';

/** How-the-model-works notes for the assumptions page (not legal copy). */
export const SIMULATION_EXPORT_METHOD_NOTES: string[] = [
  'Circles use crow-flies distance, not drive time.',
  'Overlapping catchments can double-count hardware — compare sites; do not sum pools nationally.',
  'Brand turnovers are planning assumptions, not audited financials.',
  'Import and geocode competitors before trusting pool totals.',
];

/** Legal paragraph as a one-item array for the export document. */
export const SIMULATION_EXPORT_DISCLAIMER: string[] = [
  SIMULATION_EXPORT_LEGAL_DISCLAIMER,
];
