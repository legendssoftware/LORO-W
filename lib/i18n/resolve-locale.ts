/**
 * Chooses the interface language.
 * Keep this file in sync with apk/lib/i18n/resolve-locale.ts.
 */

export const UI_LOCALES = ['en', 'pt', 'fr', 'es'] as const;

export type UiLocale = (typeof UI_LOCALES)[number];

export const LANGUAGE_CHOICES = [
  { value: 'auto', label: 'AUTO' },
  { value: 'en', label: 'EN' },
  { value: 'pt', label: 'PT' },
  { value: 'fr', label: 'FR' },
  { value: 'es', label: 'ES' },
] as const;

export type LanguageChoice = (typeof LANGUAGE_CHOICES)[number]['value'];

const PORTUGUESE_REGIONS = new Set(['PT', 'BR', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL']);

const FRENCH_REGIONS = new Set([
  'FR', 'BE', 'LU', 'MC', 'SN', 'CI', 'CM', 'CD', 'MG', 'ML', 'BF', 'NE', 'TD',
  'GN', 'BJ', 'TG', 'GA', 'CG', 'CF', 'DJ', 'KM', 'HT', 'RE', 'MQ', 'GP', 'GF',
  'YT', 'PF', 'NC', 'WF',
]);

const SPANISH_REGIONS = new Set([
  'ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN',
  'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR', 'GQ',
]);

export type DeviceLocaleInput = {
  languageCode?: string | null;
  regionCode?: string | null;
  /** Full BCP 47 tag, for example pt-MZ. */
  languageTag?: string | null;
};

export function isUiLocale(value: string | null | undefined): value is UiLocale {
  return value === 'en' || value === 'pt' || value === 'fr' || value === 'es';
}

export function isLanguageChoice(value: string | null | undefined): value is LanguageChoice {
  return value === 'auto' || isUiLocale(value);
}

function regionToLocale(region: string): UiLocale | null {
  const code = region.toUpperCase();
  if (PORTUGUESE_REGIONS.has(code)) return 'pt';
  if (FRENCH_REGIONS.has(code)) return 'fr';
  if (SPANISH_REGIONS.has(code)) return 'es';
  return null;
}

function splitTag(tag: string): { language: string; region?: string } {
  const [language, region] = tag.replace('_', '-').split('-');
  return {
    language: (language ?? '').toLowerCase(),
    region: region ? region.toUpperCase() : undefined,
  };
}

function normalizeEntry(entry: DeviceLocaleInput): { language: string; region?: string } {
  if (entry.languageTag) {
    const parsed = splitTag(entry.languageTag);
    return {
      language: (entry.languageCode ?? parsed.language).toLowerCase(),
      region: (entry.regionCode ?? parsed.region)?.toUpperCase(),
    };
  }

  const raw = (entry.languageCode ?? '').trim();
  if (raw.includes('-') || raw.includes('_')) {
    const parsed = splitTag(raw);
    return {
      language: parsed.language,
      region: (entry.regionCode ?? parsed.region)?.toUpperCase(),
    };
  }

  return {
    language: raw.toLowerCase(),
    region: entry.regionCode ? entry.regionCode.toUpperCase() : undefined,
  };
}

/**
 * An explicit en, pt, fr, or es preference wins.
 * Auto, a missing value, and legacy language codes follow the device language,
 * then the country, then English.
 */
export function resolveUiLocale(
  preference: string | null | undefined,
  deviceLocales: readonly DeviceLocaleInput[],
): UiLocale {
  const trimmed = preference?.trim().toLowerCase();
  if (isUiLocale(trimmed)) return trimmed;

  for (const entry of deviceLocales) {
    const { language, region } = normalizeEntry(entry);
    if (isUiLocale(language)) return language;
    if (region) {
      const fromRegion = regionToLocale(region);
      if (fromRegion) return fromRegion;
    }
  }

  return 'en';
}

export function deviceLocalesFromTags(tags: readonly string[]): DeviceLocaleInput[] {
  return tags.filter((tag) => tag.length > 0).map((languageTag) => ({ languageTag }));
}
