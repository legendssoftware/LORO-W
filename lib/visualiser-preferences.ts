import {
  DEFAULT_SITE_OPPORTUNITY_SETTINGS,
  type HardwareBrandKey,
  type SiteOpportunityMode,
  type SiteOpportunitySettings,
  type TurnoverOverrideSettings,
} from '@/api/types/site-opportunity';

export const VISUALISER_PREFERENCES_STORAGE_KEY = 'visualiser-preferences-v1';

export interface VisualiserPreferences {
  selectedCountry: string;
  selectedProvince: string;
  showOpportunities: boolean;
  opportunityMode: SiteOpportunityMode;
  opportunitySettings: SiteOpportunitySettings;
  turnoverOverrides: TurnoverOverrideSettings;
  showSalesRepLocations: boolean;
  repLocationsMaxAgeHours: number;
}

const DEFAULT_PREFERENCES: VisualiserPreferences = {
  selectedCountry: 'South Africa',
  selectedProvince: '',
  showOpportunities: false,
  opportunityMode: 'both',
  opportunitySettings: DEFAULT_SITE_OPPORTUNITY_SETTINGS,
  turnoverOverrides: {},
  showSalesRepLocations: false,
  repLocationsMaxAgeHours: 2,
};

const HARDWARE_BRAND_KEYS: HardwareBrandKey[] = [
  'BUCO',
  'CASHBUILD',
  'BUILD IT',
  'BUILDERS',
  'POWERBUILD',
  'EST',
  'P&L HARDWARE',
  'OTHER',
];

function isSiteOpportunityMode(value: unknown): value is SiteOpportunityMode {
  return value === 'greenfield' || value === 'catchment' || value === 'both';
}

function parseBrandTurnoverOverrides(
  raw: unknown,
): Partial<Record<HardwareBrandKey, number>> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<HardwareBrandKey, number>> = {};
  for (const brand of HARDWARE_BRAND_KEYS) {
    const value = (raw as Record<string, unknown>)[brand];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      out[brand] = value;
    }
  }
  return out;
}

function parseTurnoverOverrides(raw: unknown): TurnoverOverrideSettings {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const categoryRaw = obj.categoryTurnoverOverrides;
  const categoryTurnoverOverrides: TurnoverOverrideSettings['categoryTurnoverOverrides'] =
    {};
  if (categoryRaw && typeof categoryRaw === 'object') {
    for (const key of ['retailer', 'sd'] as const) {
      const value = (categoryRaw as Record<string, unknown>)[key];
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        categoryTurnoverOverrides[key] = value;
      }
    }
  }
  return {
    brandTurnoverOverrides: parseBrandTurnoverOverrides(obj.brandTurnoverOverrides),
    categoryTurnoverOverrides,
  };
}

function parseSettings(raw: unknown): SiteOpportunitySettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SITE_OPPORTUNITY_SETTINGS;
  const s = raw as Record<string, unknown>;
  const radiusKm = Number(s.radiusMeters);
  const topN = Number(s.topN);
  const minSep = Number(s.minBranchSeparationKm);
  const captureLow = Number(s.captureLowPct);
  const captureHigh = Number(s.captureHighPct);
  const repTarget = Number(s.repTargetMonthlyZAR);
  return {
    radiusMeters:
      Number.isFinite(radiusKm) && radiusKm >= 1000 && radiusKm <= 20_000
        ? radiusKm
        : DEFAULT_SITE_OPPORTUNITY_SETTINGS.radiusMeters,
    topN:
      Number.isFinite(topN) && topN >= 3 && topN <= 30
        ? Math.round(topN)
        : DEFAULT_SITE_OPPORTUNITY_SETTINGS.topN,
    minBranchSeparationKm:
      Number.isFinite(minSep) && minSep >= 5 && minSep <= 50
        ? minSep
        : DEFAULT_SITE_OPPORTUNITY_SETTINGS.minBranchSeparationKm,
    captureLowPct:
      Number.isFinite(captureLow) && captureLow >= 0.01 && captureLow <= 1
        ? captureLow
        : DEFAULT_SITE_OPPORTUNITY_SETTINGS.captureLowPct,
    captureHighPct:
      Number.isFinite(captureHigh) && captureHigh >= 0.01 && captureHigh <= 1
        ? captureHigh
        : DEFAULT_SITE_OPPORTUNITY_SETTINGS.captureHighPct,
    repTargetMonthlyZAR:
      Number.isFinite(repTarget) && repTarget >= 100_000 && repTarget <= 50_000_000
        ? repTarget
        : DEFAULT_SITE_OPPORTUNITY_SETTINGS.repTargetMonthlyZAR,
  };
}

export function loadVisualiserPreferences(): VisualiserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(VISUALISER_PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<VisualiserPreferences>;
    return {
      selectedCountry:
        typeof parsed.selectedCountry === 'string'
          ? parsed.selectedCountry
          : DEFAULT_PREFERENCES.selectedCountry,
      selectedProvince:
        typeof parsed.selectedProvince === 'string'
          ? parsed.selectedProvince
          : DEFAULT_PREFERENCES.selectedProvince,
      showOpportunities: parsed.showOpportunities === true,
      opportunityMode: isSiteOpportunityMode(parsed.opportunityMode)
        ? parsed.opportunityMode
        : DEFAULT_PREFERENCES.opportunityMode,
      opportunitySettings: parseSettings(parsed.opportunitySettings),
      turnoverOverrides: parseTurnoverOverrides(parsed.turnoverOverrides),
      showSalesRepLocations: parsed.showSalesRepLocations === true,
      repLocationsMaxAgeHours:
        typeof parsed.repLocationsMaxAgeHours === 'number' &&
        parsed.repLocationsMaxAgeHours >= 1 &&
        parsed.repLocationsMaxAgeHours <= 24
          ? parsed.repLocationsMaxAgeHours
          : DEFAULT_PREFERENCES.repLocationsMaxAgeHours,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveVisualiserPreferences(
  patch: Partial<VisualiserPreferences>
): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadVisualiserPreferences();
    const next: VisualiserPreferences = {
      ...current,
      ...patch,
      opportunitySettings: patch.opportunitySettings
        ? { ...current.opportunitySettings, ...patch.opportunitySettings }
        : current.opportunitySettings,
      turnoverOverrides: patch.turnoverOverrides
        ? {
            ...current.turnoverOverrides,
            ...patch.turnoverOverrides,
            brandTurnoverOverrides: {
              ...current.turnoverOverrides.brandTurnoverOverrides,
              ...patch.turnoverOverrides.brandTurnoverOverrides,
            },
            categoryTurnoverOverrides: {
              ...current.turnoverOverrides.categoryTurnoverOverrides,
              ...patch.turnoverOverrides.categoryTurnoverOverrides,
            },
          }
        : current.turnoverOverrides,
    };
    localStorage.setItem(
      VISUALISER_PREFERENCES_STORAGE_KEY,
      JSON.stringify(next)
    );
  } catch {
    // ignore quota / private mode
  }
}

export function resetVisualiserPreferences(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(VISUALISER_PREFERENCES_STORAGE_KEY);
  } catch {
    // ignore
  }
}
