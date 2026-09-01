'use client';

import type { CallQualityRepRow } from '@/api/types/reports-call-quality';
import type { UserListItem } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import {
  buildCallPartyMatchIndex,
  matchNamedParty,
  type CallPartyMatchIndex,
} from '@/lib/utils/call-party-match';

export function resolveRepDisplayName(
  rep: CallQualityRepRow,
  matchIndex: CallPartyMatchIndex | null,
): string {
  const raw = rep.ownerName?.trim();
  if (raw && !/^ext\.\s/i.test(raw) && !/\(unlinked\)/i.test(raw)) {
    return raw;
  }
  if (matchIndex && rep.ownerExtension) {
    const party = matchNamedParty(null, rep.ownerExtension, matchIndex);
    if (party.kind === 'agent' && party.user) return party.label;
    if (party.label && party.label !== '—') return party.label;
  }
  if (matchIndex && raw) {
    const stripped = raw.replace(/^ext\.\s*/i, '').replace(/\s*\(unlinked\)$/i, '').trim();
    const party = matchNamedParty(stripped, rep.ownerExtension, matchIndex);
    if (party.label && party.label !== '—') return party.label;
  }
  return raw || 'Unknown';
}

export function buildCallQualityMatchIndex(
  users: UserListItem[],
  branches: BranchListItem[] = [],
): CallPartyMatchIndex {
  return buildCallPartyMatchIndex(branches, users);
}

export function repLabelMap(
  reps: CallQualityRepRow[],
  matchIndex: CallPartyMatchIndex | null,
): Map<string, string> {
  return new Map(reps.map((rep) => [rep.ownerClerkUserId, resolveRepDisplayName(rep, matchIndex)]));
}
