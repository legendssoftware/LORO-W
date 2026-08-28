import { normalizeCurrencyCode } from '@/lib/utils/erp-currency';

export type ExchangeRateMap = Map<string, number>;

export function buildExchangeRateMap(
  rates: Array<{ code: string; rate: number }> | null | undefined
): ExchangeRateMap {
  const map = new Map<string, number>();
  for (const row of rates ?? []) {
    const code = normalizeCurrencyCode(row.code);
    if (Number.isFinite(row.rate) && row.rate > 0) {
      map.set(code, row.rate);
    }
  }
  return map;
}

function forexCodeForCurrency(isoCode: string): string {
  const code = normalizeCurrencyCode(isoCode);
  if (code === 'ZAR') return 'ZAR';
  return code;
}

/**
 * Convert amount to ZAR using tblforex_history semantics: amountZAR = amount / rate.
 * Missing or invalid rates return the original amount (same as performance tracking).
 */
export function amountToZar(
  amount: number,
  fromCurrency: string,
  rates: ExchangeRateMap
): number {
  if (!Number.isFinite(amount)) return 0;
  const from = forexCodeForCurrency(fromCurrency);
  if (from === 'ZAR') return amount;
  const rate = rates.get(from);
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return amount;
  return amount / rate;
}

/**
 * Convert ZAR amount to target ISO currency: amount = zar * rate.
 */
export function zarToAmount(
  zar: number,
  toCurrency: string,
  rates: ExchangeRateMap
): number {
  if (!Number.isFinite(zar)) return 0;
  const to = forexCodeForCurrency(toCurrency);
  if (to === 'ZAR') return zar;
  const rate = rates.get(to);
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return zar;
  return zar * rate;
}

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRateMap
): number {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (from === to) return amount;
  const zar = amountToZar(amount, from, rates);
  return zarToAmount(zar, to, rates);
}

export function formatZarAmount(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    })
      .format(amount)
      .replace('ZAR', 'R');
  } catch {
    return `R ${amount.toFixed(2)}`;
  }
}
