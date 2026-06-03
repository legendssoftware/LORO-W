'use client';

import Link from 'next/link';
import type { Claim } from '@/api/types/claims';
import type { BranchListItem } from '@/api/types/branch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { claimBranchFlagAndLabel } from '@/app/reports/utils/branch-person-cell';
import {
  claimPersonDisplayName,
} from '@/app/claims/components/claim-person-row';
import { cn } from '@/lib/utils';

function statusVariant(
  s: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const x = s?.toLowerCase() ?? '';
  if (x === 'approved' || x === 'paid') return 'default';
  if (x === 'pending') return 'secondary';
  if (x === 'declined' || x === 'rejected' || x === 'cancelled')
    return 'destructive';
  return 'outline';
}

function formatLabel(s: string | undefined) {
  if (!s) return '—';
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function ownerInitials(claim: Claim): string {
  const name = claimPersonDisplayName(claim.owner);
  if (name === '—') return '?';
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ClaimRowCardSkeleton() {
  const isMobile = useIsMobile();
  return (
    <Card
      className={cn(
        'rounded-lg border border-border bg-background',
        isMobile ? 'min-h-[140px]' : 'min-h-[180px]'
      )}
    >
      <CardContent
        className={cn(
          'flex flex-col flex-1 justify-between',
          isMobile ? 'min-h-[140px] p-3' : 'min-h-[180px] p-4'
        )}
      >
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 max-w-[200px] rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
            <Skeleton className="h-3 w-full max-w-[240px] rounded-md" />
          </div>
        </div>
        <Skeleton className="mt-3 h-6 w-24 rounded-md" />
      </CardContent>
    </Card>
  );
}

export function ClaimRowCard({
  claim,
  branchByUid,
}: {
  claim: Claim;
  branchByUid: Map<number, BranchListItem>;
}) {
  const isMobile = useIsMobile();
  const refLabel = claim.claimRef || `#${claim.uid}`;
  const ownerName = claimPersonDisplayName(claim.owner);
  const branchInfo = claimBranchFlagAndLabel(claim.branch, branchByUid);

  return (
    <Link href={`/claims/${claim.uid}`} className="block h-full">
      <Card
        className={cn(
          'h-full rounded-lg border border-border bg-background transition-shadow',
          'hover:border-violet-200 hover:shadow-md',
          isMobile ? 'min-h-[140px]' : 'min-h-[180px]'
        )}
      >
        <CardContent
          className={cn(
            'flex h-full flex-col justify-between gap-2',
            isMobile ? 'min-h-[140px] p-3' : 'min-h-[180px] p-4'
          )}
        >
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="size-10 shrink-0 border border-border">
              <AvatarImage src={claim.owner?.photoURL ?? undefined} alt="" />
              <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                {ownerInitials(claim)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium leading-tight text-foreground">
                  {refLabel}
                </p>
                <Badge
                  variant={statusVariant(String(claim.status))}
                  className="shrink-0 text-xs capitalize"
                >
                  {formatLabel(String(claim.status))}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {formatLabel(claim.category)} · {claim.amount ?? '—'}
              </p>
              {ownerName !== '—' ? (
                <p className="truncate text-xs text-muted-foreground">
                  {ownerName}
                </p>
              ) : null}
              {claim.claimGroup?.title ? (
                <p className="truncate text-xs text-muted-foreground">
                  {claim.claimGroup.title}
                </p>
              ) : null}
            </div>
          </div>
          {branchInfo ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden>{branchInfo.flag}</span>
              <span className="truncate">{branchInfo.label}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
