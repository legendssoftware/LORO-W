import type { BranchMonthlySalesPoint } from '@/api/endpoints/performance-dashboard';

export interface LatestMonthlyRevenue {
  amount: number;
  monthLabel: string;
}

/** Latest month with revenue from ERP monthly YTD rows (falls back to last row). */
export function getLatestMonthlyRevenue(
  monthlyRows: BranchMonthlySalesPoint[],
): LatestMonthlyRevenue | null {
  if (monthlyRows.length === 0) return null;

  for (let i = monthlyRows.length - 1; i >= 0; i -= 1) {
    const row = monthlyRows[i]!;
    const amount = row.totalRevenue;
    if (amount != null && Number.isFinite(amount) && amount > 0) {
      return { amount, monthLabel: row.month };
    }
  }

  const last = monthlyRows[monthlyRows.length - 1]!;
  const amount = last.totalRevenue;
  if (amount == null || !Number.isFinite(amount)) return null;
  return { amount, monthLabel: last.month };
}
