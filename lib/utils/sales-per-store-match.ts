import type { BranchListItem } from '@/api/types/branch';
import { extractStoreCodeFromBranchMarker, normalizeStoreCode } from '@/lib/utils/branch-store-code';

export interface SalesPerStoreRow {
  storeId: string;
  storeName?: string;
  totalRevenue?: number;
  countryCode?: string;
}

export interface MasterBranchRow {
  id: string;
  code?: string;
  name: string;
}

function branchNamesMatchStrict(a: string, b: string): boolean {
  const na = a.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const nb = b.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return na.length > 0 && na === nb;
}

export function storeCodesMatch(a: string, b: string): boolean {
  return normalizeStoreCode(a) === normalizeStoreCode(b);
}

function getStoreCodesForBranch(
  branch: Pick<BranchListItem, 'ref' | 'alias' | 'name'>,
  masterBranches?: MasterBranchRow[],
): string[] {
  const codes: string[] = [];
  const fromRef = extractStoreCodeFromBranchMarker(branch);
  if (fromRef) codes.push(fromRef);
  if (branch.ref?.trim()) {
    codes.push(normalizeStoreCode(branch.ref.trim()));
  }

  if (masterBranches?.length) {
    const match = masterBranches.find(
      (b) =>
        branchNamesMatchStrict(branch.name ?? '', b.name) ||
        (branch.alias != null && branchNamesMatchStrict(branch.alias, b.name)),
    );
    if (match) {
      const code = match.code?.trim() || match.id?.trim();
      if (code) codes.push(normalizeStoreCode(code));
    }
  }

  return [...new Set(codes)];
}

/** Match a CRM branch to its ERP salesPerStore row (store code first, then strict name). */
export function findSalesPerStoreForBranch(
  branch: Pick<BranchListItem, 'uid' | 'ref' | 'alias' | 'name'>,
  salesPerStore: SalesPerStoreRow[],
  masterBranches?: MasterBranchRow[],
  usedStoreIds?: Set<string>,
): SalesPerStoreRow | undefined {
  const storeCodes = getStoreCodesForBranch(branch, masterBranches);
  const namesToMatch = [branch.name, branch.alias].filter(
    (n): n is string => typeof n === 'string' && n.trim().length > 0,
  );

  for (const store of salesPerStore) {
    if (usedStoreIds?.has(normalizeStoreCode(store.storeId))) continue;
    if (storeCodes.length > 0 && storeCodes.some((c) => storeCodesMatch(store.storeId, c))) {
      return store;
    }
  }

  for (const store of salesPerStore) {
    if (usedStoreIds?.has(normalizeStoreCode(store.storeId))) continue;
    const storeName = store.storeName || store.storeId;
    for (const name of namesToMatch) {
      if (branchNamesMatchStrict(name, storeName)) return store;
    }
  }

  return undefined;
}

export function parseBranchUidFromMarkerId(id: string | number): number | null {
  const s = String(id);
  const prefixed = /^(?:branch|branch-list)-(\d+)$/.exec(s);
  if (prefixed?.[1]) return Number(prefixed[1]);
  if (/^\d+$/.test(s)) return Number(s);
  return null;
}

export function findBranchListItem(
  branchId: string | number,
  branches: BranchListItem[],
): BranchListItem | undefined {
  const uid = parseBranchUidFromMarkerId(branchId);
  if (uid != null) {
    return branches.find((b) => b.uid === uid);
  }
  const idStr = String(branchId);
  return branches.find((b) => String(b.uid) === idStr || b.ref === idStr);
}

/** Period total → monthly average for turnover simulator. */
export function revenueToMonthlyAverage(
  totalRevenue: number,
  startDate: string,
  endDate: string,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1;
  return totalRevenue / Math.max(1, months);
}

export function ytdDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const endDate = end.toISOString().split('T')[0]!;
  const startDate = `${end.getFullYear()}-01-01`;
  return { startDate, endDate };
}
