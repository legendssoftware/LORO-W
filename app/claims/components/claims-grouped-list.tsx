'use client';

import type { Claim, ClaimGroup, ClaimGroupTotal } from '@/api/types/claims';
import { useSubmitClaimGroupMutation } from '@/api/hooks/use-claims';
import { ClaimRowCard, ClaimRowCardSkeleton } from '@/app/claims/components/claim-row-card';
import type { ClaimsCurrencyView } from '@/app/claims/lib/claim-display';
import type { BranchListItem } from '@/api/types/branch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatZarAmount } from '@/lib/utils/zar-fx';
import { FolderOpen, Loader2, Send } from 'lucide-react';

type FolderSection = {
  claimGroupUid: number | null;
  title: string;
  count: number;
  totalZar: number;
  isDraft: boolean;
  claims: Claim[];
};

function buildSections(
  claims: Claim[],
  groups: ClaimGroup[],
  byGroup: ClaimGroupTotal[] | undefined,
  activeGroupUid: string
): FolderSection[] {
  const claimsByGroup = new Map<number | 'none', Claim[]>();
  for (const claim of claims) {
    const key = claim.claimGroupUid ?? 'none';
    const list = claimsByGroup.get(key) ?? [];
    list.push(claim);
    claimsByGroup.set(key, list);
  }

  const summaryByUid = new Map<number | 'none', ClaimGroupTotal>();
  for (const row of byGroup ?? []) {
    summaryByUid.set(row.claimGroupUid ?? 'none', row);
  }

  const groupByUid = new Map(groups.map((g) => [g.uid, g]));
  const sections: FolderSection[] = [];
  const seen = new Set<number | 'none'>();

  function pushSection(uid: number | null) {
    const key = uid ?? 'none';
    if (seen.has(key)) return;
    seen.add(key);
    const loaded = claimsByGroup.get(key) ?? [];
    if (loaded.length === 0) return;
    const group = uid != null ? groupByUid.get(uid) : undefined;
    const summary = summaryByUid.get(key);
    const loadedZar = loaded.reduce((sum, claim) => {
      if (claim.amountZar == null || !Number.isFinite(claim.amountZar)) return sum;
      return sum + claim.amountZar;
    }, 0);
    const isDraft =
      uid == null ? false : (group?.isDraft ?? group?.submittedAt == null);
    sections.push({
      claimGroupUid: uid,
      title: summary?.title ?? group?.title ?? 'No folder',
      count: loaded.length,
      totalZar: loadedZar,
      isDraft,
      claims: loaded,
    });
  }

  if (activeGroupUid !== 'all') {
    const uid = Number.parseInt(activeGroupUid, 10);
    pushSection(Number.isInteger(uid) ? uid : null);
    return sections;
  }

  for (const group of groups) {
    pushSection(group.uid);
  }
  for (const row of byGroup ?? []) {
    if (row.claimGroupUid != null) pushSection(row.claimGroupUid);
  }
  pushSection(null);
  return sections;
}

export function ClaimsGroupedListSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i}>
          <div className="mb-3 h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <ClaimRowCardSkeleton key={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClaimsGroupedList({
  claims,
  groups,
  byGroup,
  activeGroupUid,
  branchByUid,
  currencyView,
}: {
  claims: Claim[];
  groups: ClaimGroup[];
  byGroup: ClaimGroupTotal[] | undefined;
  activeGroupUid: string;
  branchByUid: Map<number, BranchListItem>;
  currencyView: ClaimsCurrencyView;
}) {
  const submitMutation = useSubmitClaimGroupMutation();
  const sections = buildSections(claims, groups, byGroup, activeGroupUid);

  if (sections.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        No claims match your filters.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <section key={section.claimGroupUid ?? 'none'} className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FolderOpen className="size-4 shrink-0 text-violet-600" />
            <h2 className="text-sm font-medium text-foreground">
              {section.title}
            </h2>
            {section.claimGroupUid != null ? (
              section.isDraft ? (
                <Badge variant="secondary" className="text-[10px]">
                  Draft
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  Submitted
                </Badge>
              )
            ) : null}
            <p className="text-xs text-muted-foreground">
              {section.count} claim{section.count === 1 ? '' : 's'}
              {section.totalZar > 0 ? ` · ${formatZarAmount(section.totalZar)}` : ''}
            </p>
            {section.isDraft &&
            section.claimGroupUid != null &&
            section.count > 0 ? (
              <Button
                type="button"
                size="sm"
                className="ml-auto h-8 gap-1 bg-violet-600 text-xs text-white hover:bg-violet-700"
                disabled={submitMutation.isPending}
                onClick={() => submitMutation.mutate(section.claimGroupUid!)}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Submit folder
              </Button>
            ) : null}
          </div>
          {section.claims.length === 0 ? null : (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {section.claims.map((claim) => (
                <ClaimRowCard
                  key={claim.uid}
                  claim={claim}
                  branchByUid={branchByUid}
                  currencyView={currencyView}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
