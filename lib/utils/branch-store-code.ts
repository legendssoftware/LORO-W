import type { BranchListItem } from '@/api/types/branch';

/** Map ERP store code (e.g. "015") from branch ref / alias / name. */
export function extractStoreCodeFromBranchMarker(marker: {
  ref?: unknown;
  alias?: unknown;
  name?: unknown;
}): string | null {
  const candidates = [marker.ref, marker.alias, marker.name]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());

  for (const c of candidates) {
    const leadingNum = /^(\d+)\s/.exec(c);
    if (leadingNum?.[1]) return leadingNum[1].padStart(3, '0');

    const bitMatch = /bit\s*(\d+)/i.exec(c);
    if (bitMatch?.[1]) return bitMatch[1].padStart(3, '0');

    const bMatch = /^B(\d+)/i.exec(c);
    if (bMatch?.[1]) return bMatch[1].padStart(3, '0');

    const digits = c.replace(/\D/g, '');
    if (digits.length >= 1 && digits.length <= 4) return digits.padStart(3, '0');
  }
  return null;
}

/** Resolve ERP chartStoreId for GET /reports/performance/store-monthly-ytd. */
export function resolveChartStoreId(
  branchId: string | number,
  branches: BranchListItem[]
): string | undefined {
  const idStr = String(branchId);
  const listUidMatch = /^branch-list-(\d+)$/.exec(idStr);
  if (listUidMatch?.[1]) {
    const uid = Number(listUidMatch[1]);
    const branch = branches.find((b) => b.uid === uid);
    if (branch) {
      const code = branch.ref?.trim();
      if (code) {
        const fromRef = extractStoreCodeFromBranchMarker({ ref: code });
        if (fromRef) return fromRef;
        return code;
      }
      const fromMeta = extractStoreCodeFromBranchMarker(branch);
      if (fromMeta) return fromMeta;
    }
  }

  const branch = branches.find(
    (b) => String(b.uid) === idStr || b.ref === idStr
  );
  if (branch) {
    const code = extractStoreCodeFromBranchMarker(branch);
    if (code) return code;
    if (branch.ref?.trim()) return branch.ref.trim();
  }

  return idStr;
}
