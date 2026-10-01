'use client';

import type { ReactNode } from 'react';
import type { ReportsTargetRow } from '@/app/reports/lib/reports-target-row';
import { formatPolicyPct, policyStatusLabel } from '@/app/reports/lib/reports-policy-format';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PolicyStatus } from '@/api/types/performance-policy';

/** Number of policy columns appended to the Targets table. */
export const POLICY_COLUMN_COUNT = 4;

const NO_POLICY_HINT =
  'Policy is shown for a date range when the sales performance policy is enabled.';

const STATUS_BADGE: Record<PolicyStatus, string> = {
  meets_all: 'bg-green-100 text-green-800 border-green-200/80',
  below_standard: 'bg-red-100 text-red-800 border-red-200/80',
  not_measurable: 'bg-muted text-muted-foreground border-border',
};

function Dash() {
  return (
    <span className="text-xs text-muted-foreground" title={NO_POLICY_HINT}>
      —
    </span>
  );
}

/** Shared loading / empty handling so each cell only renders its populated state. */
function PolicyCell({
  row,
  skeletonClassName,
  children,
}: {
  row: ReportsTargetRow;
  skeletonClassName: string;
  children: (policy: NonNullable<ReportsTargetRow['policy']>) => ReactNode;
}) {
  if (row.policyLoading && !row.policy) return <Skeleton className={skeletonClassName} />;
  if (!row.policy) return <Dash />;
  return <>{children(row.policy)}</>;
}

/** Policy standard status badge (meets / below / not measurable). */
export function PolicyStatusCell({ row }: { row: ReportsTargetRow }) {
  return (
    <PolicyCell row={row} skeletonClassName="h-5 w-20 rounded-full">
      {(policy) => (
        <Badge
          variant="outline"
          className={cn('text-[10px] font-medium', STATUS_BADGE[policy.status])}
          title={
            policy.failedStandards.length > 0
              ? `Below on: ${policy.failedStandards.join(', ')}`
              : policyStatusLabel(policy.status)
          }
        >
          {policyStatusLabel(policy.status)}
        </Badge>
      )}
    </PolicyCell>
  );
}

/** Org-schedule expected working days, the divisor behind the prorated targets. */
export function PolicyExpectedDaysCell({ row }: { row: ReportsTargetRow }) {
  return (
    <PolicyCell row={row} skeletonClassName="h-4 w-10">
      {(policy) => (
        <span
          className="text-sm tabular-nums"
          title="Expected working days in range (org schedule, net of leave and approved exceptions)"
        >
          {policy.expectedDays}
        </span>
      )}
    </PolicyCell>
  );
}

/** Weighted policy activity achievement. */
export function PolicyActivityCell({ row }: { row: ReportsTargetRow }) {
  return (
    <PolicyCell row={row} skeletonClassName="h-4 w-12">
      {(policy) => (
        <span className="text-sm font-semibold tabular-nums">
          {formatPolicyPct(policy.activityPct)}
        </span>
      )}
    </PolicyCell>
  );
}

/** Visits that failed verification checks in the range. */
export function PolicyFlaggedCell({ row }: { row: ReportsTargetRow }) {
  return (
    <PolicyCell row={row} skeletonClassName="h-4 w-8">
      {(policy) => (
        <span
          className={cn(
            'text-sm tabular-nums',
            policy.flaggedVisits > 0 ? 'font-semibold text-amber-700' : 'text-muted-foreground'
          )}
        >
          {policy.flaggedVisits}
        </span>
      )}
    </PolicyCell>
  );
}
