'use client';

import { useState } from 'react';
import type { Claim, ClaimGroup, ClaimGroupTotal } from '@/api/types/claims';
import { useSubmitClaimGroupMutation } from '@/api/hooks/use-claims';
import { ClaimRowCard, ClaimRowCardSkeleton } from '@/app/claims/components/claim-row-card';
import { claimPersonDisplayName } from '@/app/claims/components/claim-person-row';
import type { ClaimsCurrencyView } from '@/app/claims/lib/claim-display';
import type { BranchListItem } from '@/api/types/branch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatZarAmount } from '@/lib/utils/zar-fx';
import { ChevronRight, FolderOpen, Loader2, Send } from 'lucide-react';

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

type OwnerSection = {
  key: string;
  title: string;
  photoURL?: string;
  count: number;
  totalZar: number;
  claims: Claim[];
};

function ownerSectionKey(claim: Claim): string {
  if (claim.owner?.uid != null) return `uid:${claim.owner.uid}`;
  if (claim.ownerClerkUserId) return `clerk:${claim.ownerClerkUserId}`;
  return 'unknown';
}

function ownerInitials(title: string): string {
  if (title === 'Unknown user') return '?';
  return title
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** One folder per claim owner. Used when the viewer can see every org claim. */
function buildOwnerSections(claims: Claim[]): OwnerSection[] {
  const map = new Map<string, OwnerSection>();
  for (const claim of claims) {
    const key = ownerSectionKey(claim);
    const zar =
      claim.amountZar != null && Number.isFinite(claim.amountZar)
        ? claim.amountZar
        : 0;
    const existing = map.get(key);
    if (existing) {
      existing.claims.push(claim);
      existing.count += 1;
      existing.totalZar += zar;
      continue;
    }
    const name = claimPersonDisplayName(claim.owner);
    map.set(key, {
      key,
      title: name === '—' ? 'Unknown user' : name,
      photoURL: claim.owner?.photoURL,
      count: 1,
      totalZar: zar,
      claims: [claim],
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}

function OwnerClaimFolders({
  sections,
  branchByUid,
  currencyView,
}: {
  sections: OwnerSection[];
  branchByUid: Map<number, BranchListItem>;
  currencyView: ClaimsCurrencyView;
}) {
  const onlyOne = sections.length === 1;
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) => {
        const open = openKeys[section.key] ?? onlyOne;
        return (
          <Collapsible
            key={section.key}
            open={open}
            onOpenChange={(next) =>
              setOpenKeys((prev) => ({ ...prev, [section.key]: next }))
            }
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left hover:border-violet-200 hover:bg-muted/40"
                aria-expanded={open}
              >
                <ChevronRight
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform',
                    open && 'rotate-90'
                  )}
                  aria-hidden
                />
                <Avatar className="size-8 shrink-0 border border-border">
                  <AvatarImage src={section.photoURL} alt="" />
                  <AvatarFallback className="bg-muted text-xs font-medium">
                    {ownerInitials(section.title)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {section.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {section.count} claim{section.count === 1 ? '' : 's'}
                    {section.totalZar > 0
                      ? ` · ${formatZarAmount(section.totalZar)}`
                      : ''}
                  </span>
                </span>
                <FolderOpen className="size-4 shrink-0 text-violet-600" aria-hidden />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid min-w-0 gap-4 grid-cols-1 pt-3 sm:grid-cols-2 xl:grid-cols-4">
                {section.claims.map((claim) => (
                  <ClaimRowCard
                    key={claim.uid}
                    claim={claim}
                    branchByUid={branchByUid}
                    currencyView={currencyView}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
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
  groupByOwner = false,
}: {
  claims: Claim[];
  groups: ClaimGroup[];
  byGroup: ClaimGroupTotal[] | undefined;
  activeGroupUid: string;
  branchByUid: Map<number, BranchListItem>;
  currencyView: ClaimsCurrencyView;
  /** Admin, owner, and manager: one collapsible folder per claim owner. */
  groupByOwner?: boolean;
}) {
  const submitMutation = useSubmitClaimGroupMutation();
  const ownerSections = groupByOwner ? buildOwnerSections(claims) : [];
  const sections = groupByOwner
    ? []
    : buildSections(claims, groups, byGroup, activeGroupUid);

  if (groupByOwner) {
    if (ownerSections.length === 0) {
      return (
        <p className="py-10 text-center text-muted-foreground">
          No claims match your filters.
        </p>
      );
    }
    return (
      <OwnerClaimFolders
        sections={ownerSections}
        branchByUid={branchByUid}
        currencyView={currencyView}
      />
    );
  }

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
