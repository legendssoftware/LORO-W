import type { UserListItem } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import { getBranchDisplayLabel } from '@/api/types/branch';
import type { CallRecordingListItem } from '@/api/types/calls';

const EXTENSION_MAX_LENGTH = 8;
const HQ_NORMALIZED = new Set(['mainoffice', 'headoffice', 'headquarters', 'hq']);

export type CallPartyKind = 'branch' | 'agent' | 'other';

export type MatchedCallParty = {
  kind: CallPartyKind;
  label: string;
  branch: BranchListItem | null;
  user: UserListItem | null;
};

export type CallPartyMatchIndex = {
  branches: BranchListItem[];
  byNormalizedName: Map<string, BranchListItem>;
  hqBranch: BranchListItem | null;
  usersByExtension: Map<string, UserListItem>;
};

/** Strip Bit prefix and non-alphanumerics for PBX name ↔ branch matching. */
export function normalizeBranchNameForMatch(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^bit/, '');
}

export function isRingGroupLabel(name: string): boolean {
  return /^ring\s*group/i.test(name.trim());
}

export function isHqPartyLabel(name: string): boolean {
  return HQ_NORMALIZED.has(normalizeBranchNameForMatch(name));
}

export function isPbxExtensionValue(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return false;
  return trimmed.length <= EXTENSION_MAX_LENGTH && /^\d+$/.test(trimmed);
}

function pbxExtensionOf(user: UserListItem): string | null {
  const raw = user.pbxExtension;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function branchNamesMatch(a: string, b: string): boolean {
  const na = normalizeBranchNameForMatch(a);
  const nb = normalizeBranchNameForMatch(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) {
    return true;
  }
  return false;
}

function isHqBranch(branch: BranchListItem): boolean {
  const labels = [branch.alias, branch.name, getBranchDisplayLabel(branch)].filter(
    (label): label is string => typeof label === 'string' && label.trim().length > 0,
  );
  return labels.some((label) => isHqPartyLabel(label));
}

function emptyParty(label = '—'): MatchedCallParty {
  return { kind: 'other', label, branch: null, user: null };
}

/**
 * Pre-index branches and users so table rows can resolve PBX names without
 * scanning the full lists on every cell render.
 */
export function buildCallPartyMatchIndex(
  branches: BranchListItem[],
  users: UserListItem[],
): CallPartyMatchIndex {
  const byNormalizedName = new Map<string, BranchListItem>();
  for (const branch of branches) {
    const labels = [branch.alias, branch.name, getBranchDisplayLabel(branch)].filter(
      (label): label is string => typeof label === 'string' && label.trim().length > 0,
    );
    for (const label of labels) {
      const key = normalizeBranchNameForMatch(label);
      if (key && !byNormalizedName.has(key)) byNormalizedName.set(key, branch);
    }
  }

  const usersByExtension = new Map<string, UserListItem>();
  for (const user of users) {
    const ext = pbxExtensionOf(user);
    if (ext && !usersByExtension.has(ext)) usersByExtension.set(ext, user);
  }

  return {
    branches,
    byNormalizedName,
    hqBranch: branches.find((branch) => isHqBranch(branch)) ?? null,
    usersByExtension,
  };
}

function findBranchByName(name: string, index: CallPartyMatchIndex): BranchListItem | null {
  const key = normalizeBranchNameForMatch(name);
  if (!key) return null;
  const exact = index.byNormalizedName.get(key);
  if (exact) return exact;
  for (const [stored, branch] of index.byNormalizedName) {
    if (stored.length >= 4 && key.length >= 4 && (stored.includes(key) || key.includes(stored))) {
      return branch;
    }
  }
  for (const branch of index.branches) {
    const labels = [branch.alias, branch.name, getBranchDisplayLabel(branch)].filter(
      (label): label is string => typeof label === 'string' && label.trim().length > 0,
    );
    if (labels.some((label) => branchNamesMatch(name, label))) return branch;
  }
  return null;
}

function userDisplayName(user: UserListItem): string {
  return [user.name, user.surname].filter(Boolean).join(' ').trim() || `User ${user.uid}`;
}

function branchOfUser(user: UserListItem, index: CallPartyMatchIndex): BranchListItem | null {
  const uid =
    typeof user.branchUid === 'number' && user.branchUid > 0
      ? user.branchUid
      : user.branch?.uid;
  if (typeof uid !== 'number' || uid <= 0) return null;
  return index.branches.find((branch) => branch.uid === uid) ?? null;
}

/**
 * Resolve a PBX party name/number to a branch (red), a person (green agent),
 * or a generic other party (green). Ring groups never match as branches.
 */
export function matchNamedParty(
  name: string | null | undefined,
  number: string | null | undefined,
  index: CallPartyMatchIndex,
): MatchedCallParty {
  const trimmedName = name?.trim() || '';
  const trimmedNumber = number?.trim() || '';

  if (trimmedName && isRingGroupLabel(trimmedName)) {
    return { kind: 'other', label: trimmedName, branch: null, user: null };
  }

  if (trimmedName && isHqPartyLabel(trimmedName)) {
    const hq = index.hqBranch ?? findBranchByName(trimmedName, index);
    if (hq) {
      return {
        kind: 'branch',
        label: getBranchDisplayLabel(hq) || trimmedName,
        branch: hq,
        user: null,
      };
    }
  }

  if (trimmedName) {
    const branch = findBranchByName(trimmedName, index);
    if (branch) {
      return {
        kind: 'branch',
        label: getBranchDisplayLabel(branch) || trimmedName,
        branch,
        user: null,
      };
    }
  }

  if (isPbxExtensionValue(trimmedNumber)) {
    const user = index.usersByExtension.get(trimmedNumber);
    if (user) {
      const branch = branchOfUser(user, index);
      return {
        kind: 'agent',
        label: userDisplayName(user),
        branch,
        user,
      };
    }
  }

  if (trimmedName) {
    return { kind: 'other', label: trimmedName, branch: null, user: null };
  }
  if (trimmedNumber) {
    return { kind: 'other', label: trimmedNumber, branch: null, user: null };
  }
  return emptyParty();
}

export function matchAgentParty(
  row: Pick<CallRecordingListItem, 'ownerName' | 'fromName' | 'fromNumber'>,
  index: CallPartyMatchIndex,
): MatchedCallParty {
  const owner = row.ownerName?.trim();
  if (owner) {
    const named = matchNamedParty(row.fromName, row.fromNumber, index);
    return {
      kind: 'agent',
      label: owner,
      branch: named.branch,
      user: named.user,
    };
  }
  return matchNamedParty(row.fromName, row.fromNumber, index);
}

export function matchClientParty(
  row: Pick<CallRecordingListItem, 'client' | 'lead' | 'toName' | 'toNumber'>,
  index: CallPartyMatchIndex,
): MatchedCallParty {
  const linked = row.client?.name?.trim() || row.lead?.name?.trim();
  if (linked) {
    const named = matchNamedParty(row.toName, row.toNumber, index);
    return {
      kind: 'other',
      label: linked,
      branch: named.kind === 'branch' ? named.branch : null,
      user: named.user,
    };
  }
  return matchNamedParty(row.toName, row.toNumber, index);
}

export function uniqueMatchedBranches(
  parties: Array<MatchedCallParty | null | undefined>,
): BranchListItem[] {
  const seen = new Set<number>();
  const result: BranchListItem[] = [];
  for (const party of parties) {
    const branch = party?.branch;
    if (!branch || seen.has(branch.uid)) continue;
    seen.add(branch.uid);
    result.push(branch);
  }
  return result;
}
