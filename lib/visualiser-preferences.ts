import {
  DEFAULT_SITE_OPPORTUNITY_SETTINGS,
  type SiteOpportunityMode,
  type SiteOpportunitySettings,
} from '@/api/types/site-opportunity';

export const VISUALISER_PREFERENCES_STORAGE_KEY = 'visualiser-preferences-v1';

export interface VisualiserPreferences {
  selectedCountry: string;
  selectedProvince: string;
  showOpportunities: boolean;
  opportunityMode: SiteOpportunityMode;
  opportunitySettings: SiteOpportunitySettings;
  showSalesRepLocations: boolean;
}

const DEFAULT_PREFERENCES: VisualiserPreferences = {
  selectedCountry: 'South Africa',
  selectedProvince: '',
  showOpportunities: false,
  opportunityMode: 'both',
  opportunitySettings: DEFAULT_SITE_OPPORTUNITY_SETTINGS,
  showSalesRepLocations: false,
};

function isSiteOpportunityMode(value: unknown): value is SiteOpportunityMode {
  return value === 'greenfield' || value === 'catchment' || value === 'both';
}

function parseSettings(raw: unknown): SiteOpportunitySettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SITE_OPPORTUNITY_SETTINGS;
  const s = raw as Record<string, unknown>;
  const radiusKm = Number(s.radiusMeters);
  const topN = Number(s.topN);
  const minSep = Number(s.minBranchSeparationKm);
  const captureLow = Number(s.captureLowPct);
  const captureHigh = Number(s.captureHighPct);
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
      showSalesRepLocations: parsed.showSalesRepLocations === true,
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
