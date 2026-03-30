/**
 * Gate for GET /erp/profile/sales (matches dashboard Sales Performance card).
 * Enabled when personalTargets.sales.target > 0 so we avoid useless calls.
 */

export function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

export function hasSalesTargetForProfileSales(userTarget: unknown): boolean {
  if (!isRecord(userTarget)) return false;
  const pt = userTarget.personalTargets;
  if (!isRecord(pt)) return false;
  const sales = pt.sales;
  if (!isRecord(sales)) return false;
  const t = sales.target;
  const target = typeof t === 'number' ? t : Number(t);
  return Number.isFinite(target) && target > 0;
}

/**
 * Server GET /erp/profile/sales only needs ERP rep code + target period dates on user targets
 * (see ErpController.getProfileSales). Used so CRM can still show invoice header counts without a sales $ target.
 */
export function canFetchProfileSales(userTarget: unknown): boolean {
  if (!isRecord(userTarget)) return false;
  const pt = userTarget.personalTargets;
  if (!isRecord(pt)) return false;
  if (pt.periodStartDate == null || pt.periodEndDate == null) return false;
  if (pt.periodStartDate === '' || pt.periodEndDate === '') return false;
  const topCode = userTarget.erpSalesRepCode;
  const ptCode = pt.erpSalesRepCode;
  const raw = typeof topCode === 'string' ? topCode : typeof ptCode === 'string' ? ptCode : '';
  return raw.trim() !== '';
}
