export const PERFORMANCE_COUNTRY_IDS = [
  'SA',
  'BOT',
  'ZAM',
  'MOZ',
  'ZW',
  'ZWI',
  'MAL',
  'CON',
  'TAN',
] as const;

export const PERFORMANCE_COUNTRY_ORDER = [...PERFORMANCE_COUNTRY_IDS] as const;

export const DEFAULT_PERFORMANCE_COUNTRY_CODE = 'SA';
export const DEFAULT_PERFORMANCE_COUNTRY = 'South Africa';

export const FALLBACK_COUNTRY_NAMES = [
  'South Africa',
  'Botswana',
  'Zambia',
  'Mozambique',
  'Zimbabwe',
  'Zim (Incognito)',
  'Malawi',
  'Congo',
  'Tanzania',
];

export const PERFORMANCE_FILTER_COUNTRIES = [
  { id: 'SA', name: 'South Africa' },
  { id: 'BOT', name: 'Botswana' },
  { id: 'ZW', name: 'Zimbabwe' },
  { id: 'ZWI', name: 'Zim (Incognito)' },
  { id: 'ZAM', name: 'Zambia' },
  { id: 'MOZ', name: 'Mozambique' },
  { id: 'MAL', name: 'Malawi' },
  { id: 'CON', name: 'Congo' },
  { id: 'TAN', name: 'Tanzania' },
] as const;

export const PERFORMANCE_FILTERS_STORAGE_KEY = '@loro/web-performance-settings';
