/**
 * Country code to flag emoji (aligned with APK performance tables).
 * Supports ISO-3166 alpha-2 aliases (e.g. BW→BOT, ZM→ZAM, ZA→SA) and branch-name hints.
 */

import type { BranchListItem } from '@/api/types/branch';

export interface CountryFlagInfo {
  code: string;
  name: string;
  flag: string;
}

const COUNTRY_FLAG_MAP: Record<string, CountryFlagInfo> = {
  SA: { code: 'SA', name: 'South Africa', flag: '🇿🇦' },
  BOT: { code: 'BOT', name: 'Botswana', flag: '🇧🇼' },
  ZAM: { code: 'ZAM', name: 'Zambia', flag: '🇿🇲' },
  MOZ: { code: 'MOZ', name: 'Mozambique', flag: '🇲🇿' },
  ZW: { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
  MAL: { code: 'MAL', name: 'Malawi', flag: '🇲🇼' },
  CON: { code: 'CON', name: 'Congo', flag: '🇨🇩' },
  NAM: { code: 'NAM', name: 'Namibia', flag: '🇳🇦' },
  LS: { code: 'LS', name: 'Lesotho', flag: '🇱🇸' },
  SZ: { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
};

/** ISO / legacy aliases → canonical keys used in COUNTRY_FLAG_MAP */
const ALIAS_TO_CANON: Record<string, string> = {
  SA: 'SA',
  ZA: 'SA',
  RSA: 'SA',
  BOT: 'BOT',
  BW: 'BOT',
  BWA: 'BOT',
  ZAM: 'ZAM',
  ZM: 'ZAM',
  ZMB: 'ZAM',
  MOZ: 'MOZ',
  MZ: 'MOZ',
  ZW: 'ZW',
  ZWE: 'ZW',
  MAL: 'MAL',
  MW: 'MAL',
  MWI: 'MAL',
  CON: 'CON',
  CD: 'CON',
  COD: 'CON',
  DRC: 'CON',
  NAM: 'NAM',
  NA: 'NAM',
  NAMIBIA: 'NAM',
  LS: 'LS',
  LSO: 'LS',
  LESOTHO: 'LS',
  SZ: 'SZ',
  SWZ: 'SZ',
  ESWATINI: 'SZ',
  SWAZILAND: 'SZ',
};

const FULL_NAME_TO_CANON: Record<string, string> = {
  'SOUTH AFRICA': 'SA',
  'SOUTH-AFRICA': 'SA',
  BOTSWANA: 'BOT',
  ZAMBIA: 'ZAM',
  MOZAMBIQUE: 'MOZ',
  ZIMBABWE: 'ZW',
  MALAWI: 'MAL',
  CONGO: 'CON',
  'DEMOCRATIC REPUBLIC OF THE CONGO': 'CON',
  NAMIBIA: 'NAM',
  LESOTHO: 'LS',
  ESWATINI: 'SZ',
  SWAZILAND: 'SZ',
};

/**
 * Map a single country string (column or free text) to SA | BOT | ZAM | MOZ | ZW | MAL | CON, or null if unknown.
 */
export function normalizeCountryToken(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const u = raw.trim().toUpperCase();
  if (!u) return null;
  if (ALIAS_TO_CANON[u]) return ALIAS_TO_CANON[u];
  const spaced = u.replace(/\s+/g, ' ');
  if (FULL_NAME_TO_CANON[spaced]) return FULL_NAME_TO_CANON[spaced];
  return null;
}

/**
 * Prefer `branch.country`, then `address.country`, for normalization.
 */
export function normalizeCountryCodeForUi(
  country?: string | null,
  addressCountry?: string | null
): string | null {
  for (const c of [country, addressCountry]) {
    const t = normalizeCountryToken(c);
    if (t) return t;
  }
  return null;
}

/**
 * Infer country from branch labels when DB country is missing or non-standard (e.g. city-style names).
 */
function inferCountryFromBranchLabels(branch: BranchListItem): string | null {
  const haystack = [branch.alias, branch.name, branch.ref].filter(Boolean).join(' ').toLowerCase();
  if (!haystack) return null;
  if (haystack.includes('denver')) return 'SA';
  if (haystack.includes('gaborone')) return 'BOT';
  if (haystack.includes('lusaka')) return 'ZAM';
  if (haystack.includes('harare')) return 'ZW';
  return null;
}

/**
 * Canonical country code for grouping / flags / CSV — matches other branches that store SA, BOT, ZAM, etc.
 */
export function normalizeBranchCountryCodeForGrouping(branch: BranchListItem): string {
  const fromFields = normalizeCountryCodeForUi(branch.country, branch.address?.country);
  if (fromFields) return fromFields;
  const inferred = inferCountryFromBranchLabels(branch);
  if (inferred) return inferred;
  const raw = branch.country?.trim();
  if (!raw) return 'SA';
  return raw.toUpperCase();
}

export function getCountryFlag(countryCode: string): CountryFlagInfo {
  const canon = normalizeCountryToken(countryCode);
  const normalizedCode =
    canon ?? (countryCode?.trim() ? countryCode.trim().toUpperCase() : 'SA');
  const known = COUNTRY_FLAG_MAP[normalizedCode];
  if (known) return known;
  return { code: normalizedCode, name: 'Other', flag: '🌍' };
}
