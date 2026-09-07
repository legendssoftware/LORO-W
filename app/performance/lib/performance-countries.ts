import { PERFORMANCE_COUNTRY_IDS } from './constants';

const COUNTRY_CODE_MAP: Record<string, string> = {
  sa: 'SA',
  'south africa': 'SA',
  za: 'SA',
  bot: 'BOT',
  botswana: 'BOT',
  bw: 'BOT',
  zam: 'ZAM',
  zambia: 'ZAM',
  zm: 'ZAM',
  moz: 'MOZ',
  mozambique: 'MOZ',
  mz: 'MOZ',
  zw: 'ZW',
  zimbabwe: 'ZW',
  zwi: 'ZWI',
  'zim (incognito)': 'ZWI',
  'zimbabwe incognito': 'ZWI',
  mal: 'MAL',
  malawi: 'MAL',
  mw: 'MAL',
  con: 'CON',
  congo: 'CON',
  drc: 'CON',
  cd: 'CON',
  tan: 'TAN',
  tanzania: 'TAN',
  tz: 'TAN',
  tza: 'TAN',
};

const COUNTRY_NAME_MAP: Record<string, string> = {
  SA: 'South Africa',
  BOT: 'Botswana',
  ZAM: 'Zambia',
  MOZ: 'Mozambique',
  ZW: 'Zimbabwe',
  ZWI: 'Zim (Incognito)',
  MAL: 'Malawi',
  CON: 'Congo',
  TAN: 'Tanzania',
};

export function normalizePerformanceCountryCode(
  value: string | undefined | null
): string | undefined {
  if (!value?.trim()) return undefined;
  const key = value.trim().toLowerCase();
  return COUNTRY_CODE_MAP[key] ?? value.trim().toUpperCase();
}

export function normalizePerformanceCountryCodes(
  values: string[] | undefined
): string[] | undefined {
  if (!values?.length) return undefined;
  const normalized = [
    ...new Set(
      values
        .map((value) => normalizePerformanceCountryCode(value))
        .filter((value): value is string => Boolean(value))
    ),
  ];
  return normalized.length > 0 ? normalized : undefined;
}

export function getCountryDisplayName(code: string): string {
  return COUNTRY_NAME_MAP[code] ?? code;
}

export function getCountriesDisplayLabel(countries: string[] | undefined): string {
  if (!countries?.length) {
    return `All Countries (${PERFORMANCE_COUNTRY_IDS.map(getCountryDisplayName).join(', ')})`;
  }
  const names = countries.map(getCountryDisplayName);
  return `All Countries (${names.join(', ')})`;
}

export function stableCountriesKey(countries: string[] | undefined): string {
  return (countries ?? []).slice().sort().join(',') || 'all';
}
