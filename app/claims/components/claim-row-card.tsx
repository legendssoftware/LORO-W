'use client';

import Link from 'next/link';
import type { Claim } from '@/api/types/claims';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

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

export function ClaimRowCardSkeleton() {
  return (
    <Card className="rounded-lg border border-gray-200 bg-white">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-48 rounded-md" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </CardContent>
    </Card>
  );
}

export function ClaimRowCard({ claim }: { claim: Claim }) {
  const refLabel = claim.claimRef || `#${claim.uid}`;
  const owner =
    claim.owner?.name || claim.owner?.surname
      ? `${claim.owner?.name ?? ''} ${claim.owner?.surname ?? ''}`.trim()
      : (claim.owner?.email ?? '');

  return (
    <Link href={`/claims/${claim.uid}`} className="block">
      <Card
        className={cn(
          'rounded-lg border border-gray-200 bg-white transition-colors',
          'hover:border-red-300 hover:bg-red-50/50'
        )}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{refLabel}</span>
              <Badge variant={statusVariant(String(claim.status))} className="text-xs capitalize">
                {formatLabel(String(claim.status))}
              </Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {formatLabel(claim.category)} · {claim.amount ?? '—'}
              {owner ? ` · ${owner}` : ''}
            </p>
            {claim.claimGroup?.title ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Folder: {claim.claimGroup.title}
              </p>
            ) : null}
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
