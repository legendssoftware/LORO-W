/**
 * ERP country / currency helpers — mirrors server/src/erp/utils/currency.util.ts
 */

export interface ErpCurrencyInfo {
  code: string;
  symbol: string;
  locale: string;
  name: string;
}

const COUNTRY_CURRENCY_MAP: Record<string, ErpCurrencyInfo> = {
  SA: { code: 'ZAR', symbol: 'R', locale: 'en-ZA', name: 'South African Rand' },
  BOT: { code: 'BWP', symbol: 'P', locale: 'en-BW', name: 'Botswana Pula' },
  ZAM: { code: 'ZMW', symbol: 'ZK', locale: 'en-ZM', name: 'Zambian Kwacha' },
  MOZ: { code: 'MZN', symbol: 'MT', locale: 'pt-MZ', name: 'Mozambican Metical' },
  ZW: { code: 'ZWL', symbol: 'ZiG', locale: 'en-ZW', name: 'Zimbabwean Gold' },
  MAL: { code: 'MWK', symbol: 'MK', locale: 'en-MW', name: 'Malawian Kwacha' },
  CON: { code: 'CDF', symbol: 'FC', locale: 'fr-CD', name: 'Congolese Franc' },
  TAN: { code: 'TZS', symbol: 'TSh', locale: 'en-TZ', name: 'Tanzanian Shilling' },
};

/** Forex codes queried from tblforex_history for ZAR conversion. */
export const PERFORMANCE_FOREX_CODES = [
  'BWP',
  'ZMW',
  'MZN',
  'ZWL',
  'USD',
  'EUR',
  'MWK',
  'CDF',
  'TZS',
] as const;

export function normalizeErpCountryCode(countryCode?: string | null): string {
  const raw = countryCode?.trim().toUpperCase();
  if (!raw) return 'SA';
  if (raw === 'BOTSWANA') return 'BOT';
  if (raw === 'ZAMBIA') return 'ZAM';
  if (raw === 'MOZAMBIQUE') return 'MOZ';
  if (raw === 'ZIMBABWE') return 'ZW';
  if (raw === 'MALAWI') return 'MAL';
  if (raw === 'CONGO') return 'CON';
  if (raw === 'TANZANIA') return 'TAN';
  return raw;
}

export function getCurrencyForCountry(countryCode?: string | null): ErpCurrencyInfo {
  const normalized = normalizeErpCountryCode(countryCode);
  return COUNTRY_CURRENCY_MAP[normalized] ?? COUNTRY_CURRENCY_MAP.SA;
}

/**
 * ISO code used to look up tblforex_history when converting branch/sales amounts to ZAR.
 * Zimbabwe ERP totals are USD.
 */
export function getForexCodeForZarConversion(countryCode?: string | null): string {
  const normalized = normalizeErpCountryCode(countryCode);
  if (normalized === 'ZW') return 'USD';
  return getCurrencyForCountry(normalized).code;
}

/** Currency of ERP sales amounts for a branch country (ZW → USD). */
export function getErpSalesCurrencyForCountry(countryCode?: string | null): string {
  return getForexCodeForZarConversion(countryCode);
}

export function normalizeCurrencyCode(code?: string | null): string {
  const raw = code?.trim().toUpperCase();
  if (!raw) return 'ZAR';
  if (raw === 'R') return 'ZAR';
  return raw;
}
