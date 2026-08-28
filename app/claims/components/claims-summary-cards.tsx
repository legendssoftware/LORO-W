'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatZarAmount } from '@/lib/utils/zar-fx';
import { cn } from '@/lib/utils';
import type { ClaimsSummaryResponse } from '@/api/types/claims';

const STAGE_CARDS = [
  { key: 'all', label: 'Total', status: null as string | null },
  { key: 'pending', label: 'Pending', status: 'pending' },
  { key: 'approved', label: 'Approved', status: 'approved' },
  { key: 'declined', label: 'Declined', status: 'declined' },
  { key: 'paid', label: 'Paid', status: 'paid' },
] as const;

function statusTotals(
  summary: ClaimsSummaryResponse | undefined,
  status: string | null
): { count: number; totalZar: number } {
  if (!summary) return { count: 0, totalZar: 0 };
  if (status == null) {
    const count = summary.byStatus.reduce((sum, row) => sum + row.count, 0);
    return { count, totalZar: summary.totalZar };
  }
  const row = summary.byStatus.find(
    (item) => item.status.toLowerCase() === status
  );
  return { count: row?.count ?? 0, totalZar: row?.totalZar ?? 0 };
}

export function ClaimsSummaryCardsSkeleton() {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {STAGE_CARDS.map((card) => (
        <Card key={card.key}>
          <CardContent className="p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-24" />
            <Skeleton className="mt-2 h-3 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ClaimsSummaryCards({
  summary,
  isLoading,
  activeStatus,
  onStatusChange,
}: {
  summary: ClaimsSummaryResponse | undefined;
  isLoading?: boolean;
  activeStatus: string;
  onStatusChange: (status: string) => void;
}) {
  if (isLoading) return <ClaimsSummaryCardsSkeleton />;

  const unconverted = summary?.unconvertedCount ?? 0;

  return (
    <div className="mb-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STAGE_CARDS.map((card) => {
          const totals = statusTotals(summary, card.status);
          const selected =
            card.status == null
              ? activeStatus === 'all'
              : activeStatus === card.status;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() =>
                onStatusChange(card.status == null ? 'all' : card.status)
              }
              className="text-left"
            >
              <Card
                className={cn(
                  'h-full transition-colors',
                  selected
                    ? 'border-violet-500 ring-1 ring-violet-500/40'
                    : 'hover:border-violet-300 dark:hover:border-violet-600'
                )}
              >
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
                    {formatZarAmount(totals.totalZar)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totals.count} claim{totals.count === 1 ? '' : 's'}
                  </p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
      {unconverted > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {unconverted} claim{unconverted === 1 ? '' : 's'} could not be
          converted to ZAR (no FX rate on the claim date).
        </p>
      ) : null}
    </div>
  );
}
