/**
 * Mirrors server `call-day-rates.ts`.
 * Mon–Thu, Friday and Saturday each have their own call target. Sunday is 0.
 * A week at 60 / 40 / 30 is 310. The month is the calendar sum, not 310.
 */

export interface CallDayRates {
  monThu: number;
  friday: number;
  saturday: number;
}

export const SA_CALL_DAY_RATES: CallDayRates = {
  monThu: 60,
  friday: 40,
  saturday: 30,
};

const MS_PER_DAY = 86_400_000;

export function readCallDayRates(source: {
  callTargetMonThu?: number | null;
  callTargetFriday?: number | null;
  callTargetSaturday?: number | null;
} | null | undefined): CallDayRates | null {
  if (!source) return null;
  const monThu = toRate(source.callTargetMonThu);
  const friday = toRate(source.callTargetFriday);
  const saturday = toRate(source.callTargetSaturday);
  if (monThu == null || friday == null || saturday == null) return null;
  if (monThu <= 0 && friday <= 0 && saturday <= 0) return null;
  return { monThu, friday, saturday };
}

/** Calls required on one yyyy-MM-dd day. */
export function callRateForYmd(ymd: string, rates: CallDayRates): number {
  const date = new Date(`${ymd.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return 0;
  const dow = date.getUTCDay();
  if (dow === 0) return 0;
  if (dow === 5) return rates.friday;
  if (dow === 6) return rates.saturday;
  return rates.monThu;
}

/** Inclusive sum. Sunday contributes nothing. */
export function sumCallTargets(startYmd: string, endYmd: string, rates: CallDayRates): number {
  const start = Date.parse(`${startYmd.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${endYmd.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  let total = 0;
  for (let t = start; t <= end; t += MS_PER_DAY) {
    total += callRateForYmd(new Date(t).toISOString().slice(0, 10), rates);
  }
  return total;
}

export function weeklyCallTarget(rates: CallDayRates): number {
  return rates.monThu * 4 + rates.friday + rates.saturday;
}

function toRate(value: number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
