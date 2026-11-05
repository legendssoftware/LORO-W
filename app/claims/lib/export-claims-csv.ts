import type { Claim, ClaimGroup } from '@/api/types/claims';
import { exportToCsv } from '@/lib/utils/csv-export';

function ownerName(claim: Claim): string {
  const person = claim.owner;
  if (!person) return 'Unknown user';
  const name = `${person.name ?? ''} ${person.surname ?? ''}`.trim();
  return name || person.email || 'Unknown user';
}

function claimCreatedTime(claim: Claim): number {
  if (!claim.createdAt) return 0;
  const time = new Date(claim.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function amountLabel(claim: Claim): string {
  if (typeof claim.amount === 'number' && Number.isFinite(claim.amount)) {
    return String(claim.amount);
  }
  if (typeof claim.amount === 'string' && claim.amount.trim()) return claim.amount;
  if (claim.amountNumeric != null && Number.isFinite(claim.amountNumeric)) {
    return String(claim.amountNumeric);
  }
  return '';
}

/**
 * Download claims as CSV, one row per claim, ordered by owner then newest first.
 */
export function exportClaimsPerUserCsv(
  claims: Claim[],
  groups: ClaimGroup[]
): void {
  const folderByUid = new Map(groups.map((group) => [group.uid, group.title]));
  const sorted = [...claims].sort((a, b) => {
    const byOwner = ownerName(a).localeCompare(ownerName(b));
    if (byOwner !== 0) return byOwner;
    return claimCreatedTime(b) - claimCreatedTime(a);
  });

  const rows = sorted.map((claim) => {
    const folder =
      claim.claimGroup?.title ??
      (claim.claimGroupUid != null
        ? folderByUid.get(claim.claimGroupUid)
        : undefined) ??
      '';
    const created = claim.createdAt ? claim.createdAt.slice(0, 10) : '';
    const amountZar =
      claim.amountZar != null && Number.isFinite(claim.amountZar)
        ? String(claim.amountZar)
        : '';
    return [
      ownerName(claim),
      claim.owner?.email ?? '',
      claim.claimRef || String(claim.uid),
      claim.category ?? '',
      String(claim.status ?? ''),
      amountLabel(claim),
      claim.currency ?? '',
      amountZar,
      created,
      folder,
      claim.branch?.name ?? '',
    ];
  });

  const stamp = new Date().toISOString().slice(0, 10);
  exportToCsv(
    [
      'User',
      'Email',
      'Claim ref',
      'Category',
      'Status',
      'Amount',
      'Currency',
      'Amount ZAR',
      'Created',
      'Folder',
      'Branch',
    ],
    rows,
    `claims-by-user-${stamp}`
  );
}
