/**
 * Country code to flag emoji (aligned with APK performance tables).
 */

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
};

export function getCountryFlag(countryCode: string): CountryFlagInfo {
  const normalizedCode = countryCode?.toUpperCase() || 'SA';
  const known = COUNTRY_FLAG_MAP[normalizedCode];
  if (known) return known;
  return { code: normalizedCode, name: 'Other', flag: '🌍' };
}
