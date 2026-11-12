import type { AxiosInstance } from 'axios';

/** One closed or live day of billable travel priced against the fuel allowance. */
export interface FuelAllowanceDay {
  date: string;
  distanceKm: number;
  litres: number;
  costZar: number;
}

/** Whether the allowance can be paid now, and how much. */
export type FuelPayDecision = 'hold' | 'overspent' | 'pay-full' | 'pay-projected';

/** Remaining monthly fuel costing after recorded travel, plus the end-of-period forecast. */
export interface FuelAllowanceBalance {
  userId: number;
  clerkUserId: string | null;
  allowanceZar: number;
  hasAllowance: boolean;
  hasRatedVehicle: boolean;
  distanceKm: number;
  litres: number;
  spentZar: number;
  /** Null when no allowance is set. Negative when travel has exceeded the allowance. */
  balanceZar: number | null;
  periodStart: string;
  periodEnd: string;
  /** Monday–Friday days from the period start through yesterday. */
  elapsedWorkingDays: number;
  /** Monday–Friday days from tomorrow through the period end. */
  remainingWorkingDays: number;
  /** Closed-day spend per weekday. Null before any weekday has closed. */
  rateZarPerDay: number | null;
  /** Spend to date plus the rate times weekdays still left. */
  projectedEndZar: number | null;
  /** Allowance minus the projected end. Null when no allowance is set. */
  projectedBalanceZar: number | null;
  payDecision: FuelPayDecision;
  /** Null while the decision is hold. */
  upfrontPayZar: number | null;
}

export interface FuelAllowanceBalanceDetail extends FuelAllowanceBalance {
  days: FuelAllowanceDay[];
}

export interface FuelAllowanceBalanceListResponse {
  message: string;
  users: FuelAllowanceBalance[];
}

/** GET /user/fuel-balances — one row per active user in the caller’s scope. */
export async function getFuelBalances(
  client: AxiosInstance
): Promise<FuelAllowanceBalanceListResponse> {
  const { data } = await client.get<FuelAllowanceBalanceListResponse>('/user/fuel-balances', {
    timeout: 120_000,
  });
  return data;
}

/** GET /user/:ref/fuel-balance — totals plus the day breakdown for settings. */
export async function getFuelBalance(
  client: AxiosInstance,
  ref: string | number
): Promise<FuelAllowanceBalanceDetail> {
  const { data } = await client.get<FuelAllowanceBalanceDetail>(
    `/user/${encodeURIComponent(String(ref))}/fuel-balance`,
    { timeout: 120_000 }
  );
  return data;
}
