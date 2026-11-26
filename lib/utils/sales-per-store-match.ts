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
  countryCode?: string;
}

const COUNTRY_NAME_TO_ERP_CODE: Record<string, string> = {
  sa: 'SA',
  za: 'SA',
  rsa: 'SA',
  'south africa': 'SA',
  bot: 'BOT',
  bw: 'BOT',
  botswana: 'BOT',
  zam: 'ZAM',
  zm: 'ZAM',
  zambia: 'ZAM',
  moz: 'MOZ',
  mz: 'MOZ',
  mozambique: 'MOZ',
  zw: 'ZW',
  zim: 'ZW',
  zimbabwe: 'ZW',
  zwi: 'ZWI',
  'zim (incognito)': 'ZWI',
  'zimbabwe incognito': 'ZWI',
  mal: 'MAL',
  mw: 'MAL',
  malawi: 'MAL',
  con: 'CON',
  cd: 'CON',
  drc: 'CON',
  congo: 'CON',
  tan: 'TAN',
  tz: 'TAN',
  tanzania: 'TAN',
};

/** Normalize branch country name/ISO code to canonical ERP country code (e.g. SA, BOT, ZAM). */
export function normalizeErpCountryCode(raw: string | null | undefined): string | undefined {
  const key = raw?.trim().toLowerCase();
  if (!key) return undefined;
  return COUNTRY_NAME_TO_ERP_CODE[key] ?? raw?.trim().toUpperCase();
}

/** Unique key for a salesPerStore row scoped by countryCode + normalized storeId. */
export function salesPerStoreKey(store: Pick<SalesPerStoreRow, 'storeId' | 'countryCode'>): string {
  const cc = normalizeErpCountryCode(store.countryCode) ?? '';
  return `${cc}:${normalizeStoreCode(store.storeId)}`;
}

/** Strip BitDrywall "Bit" prefix and non-alphanumerics for ERP name matching. */
function normalizeBranchNameForMatch(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^bit/, '');
}

function branchNamesMatchStrict(a: string, b: string): boolean {
  const na = normalizeBranchNameForMatch(a);
  const nb = normalizeBranchNameForMatch(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Soft: one contains the other when both are meaningful (e.g. BitMidrand ↔ Midrand)
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) {
    return true;
  }
  return false;
}

export function storeCodesMatch(a: string, b: string): boolean {
  return normalizeStoreCode(a) === normalizeStoreCode(b);
}

function getStoreCodesForBranch(
  branch: Pick<BranchListItem, 'ref' | 'alias' | 'name' | 'country' | 'address'>,
  masterBranches?: MasterBranchRow[],
): string[] {
  const codes: string[] = [];
  const fromRef = extractStoreCodeFromBranchMarker(branch);
  if (fromRef) codes.push(fromRef);
  if (branch.ref?.trim()) {
    codes.push(normalizeStoreCode(branch.ref.trim()));
  }

  const branchCountry = normalizeErpCountryCode(branch.country ?? branch.address?.country);

  if (masterBranches?.length) {
    const match = masterBranches.find((b) => {
      const masterCountry = normalizeErpCountryCode(b.countryCode);
      if (branchCountry && masterCountry && branchCountry !== masterCountry) {
        return false;
      }
      return (
        branchNamesMatchStrict(branch.name ?? '', b.name) ||
        (branch.alias != null && branchNamesMatchStrict(branch.alias, b.name))
      );
    });
    if (match) {
      const code = match.code?.trim() || match.id?.trim();
      if (code) codes.push(normalizeStoreCode(code));
    }
  }

  return [...new Set(codes)];
}

/** Match a CRM branch to its ERP salesPerStore row (country-scoped store code first, then strict name). */
export function findSalesPerStoreForBranch(
  branch: Pick<BranchListItem, 'uid' | 'ref' | 'alias' | 'name' | 'country' | 'address'>,
  salesPerStore: SalesPerStoreRow[],
  masterBranches?: MasterBranchRow[],
  usedStoreKeys?: Set<string>,
): SalesPerStoreRow | undefined {
  const storeCodes = getStoreCodesForBranch(branch, masterBranches);
  const branchCountry = normalizeErpCountryCode(branch.country ?? branch.address?.country);
  const namesToMatch = [branch.name, branch.alias].filter(
    (n): n is string => typeof n === 'string' && n.trim().length > 0,
  );

  const isCountryCompatible = (store: SalesPerStoreRow): boolean => {
    const storeCountry = normalizeErpCountryCode(store.countryCode);
    if (branchCountry && storeCountry) {
      return branchCountry === storeCountry;
    }
    return true;
  };

  for (const store of salesPerStore) {
    if (usedStoreKeys?.has(salesPerStoreKey(store))) continue;
    if (!isCountryCompatible(store)) continue;
    if (storeCodes.length > 0 && storeCodes.some((c) => storeCodesMatch(store.storeId, c))) {
      return store;
    }
  }

  for (const store of salesPerStore) {
    if (usedStoreKeys?.has(salesPerStoreKey(store))) continue;
    if (!isCountryCompatible(store)) continue;
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

/** Current calendar month (1st → local today) — matches Performance Tracker monthly comparison. */
export function monthlyDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return { startDate: `${y}-${m}-01`, endDate: `${y}-${m}-${d}` };
}

/** Short label for the current month (e.g. "Jul 2026"). */
export function currentMonthLabel(date = new Date()): string {
  try {
    return date.toLocaleString('en-ZA', { month: 'short', year: 'numeric' });
  } catch {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
