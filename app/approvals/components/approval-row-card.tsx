'use client';

import { format, parseISO } from 'date-fns';
import type { Approval } from '@/api/types/approvals';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatApprovalTypeLabel } from '@/app/approvals/intake-form-fields';

function statusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const value = status.toLowerCase();
  if (value === 'approved') return 'default';
  if (value === 'pending' || value === 'under_review' || value === 'submitted') {
    return 'secondary';
  }
  if (value === 'rejected' || value === 'declined') return 'destructive';
  return 'outline';
}

function formatDate(value?: string): string | null {
  if (!value) return null;
  try {
    return format(parseISO(value), 'd MMM yyyy');
  } catch {
    return value;
  }
}

export function ApprovalRowCardSkeleton() {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardContent className="flex min-h-[160px] flex-col justify-between p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
          <Skeleton className="h-3 w-full rounded-md" />
        </div>
        <Skeleton className="mt-3 h-6 w-24 rounded-md" />
      </CardContent>
    </Card>
  );
}

export function ApprovalRowCard({
  approval,
  onOpen,
}: {
  approval: Approval;
  onOpen: (approval: Approval) => void;
}) {
  const submitted = formatDate(approval.submittedAt ?? approval.createdAt);
  const deadline = formatDate(approval.deadline);

  return (
    <button
      type="button"
      onClick={() => onOpen(approval)}
      className="block w-full text-left"
    >
      <Card className="h-full rounded-lg border border-border bg-background transition-colors hover:border-violet-300">
        <CardContent className="flex min-h-[160px] flex-col justify-between p-4">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {approval.approvalReference || `APR-${approval.uid}`}
              </p>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                {approval.priority ? (
                  <Badge variant="outline" className="capitalize">
                    {approval.priority}
                  </Badge>
                ) : null}
                <Badge variant={statusVariant(approval.status)} className="uppercase">
                  {approval.status}
                </Badge>
              </div>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-foreground">{approval.title}</p>
            {approval.description ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {approval.description}
              </p>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formatApprovalTypeLabel(approval.type)}</span>
            {submitted ? <span>Submitted {submitted}</span> : null}
            {deadline ? (
              <span className={cn(approval.isOverdue && 'text-destructive')}>
                Due {deadline}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
