'use client';

import { format, parseISO } from 'date-fns';
import { Calendar, Clock, DollarSign, FileText, User } from 'lucide-react';
import type { Approval } from '@/api/types/approvals';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatApprovalTypeLabel } from '@/app/approvals/intake-form-fields';
import {
  approvalPriorityClassName,
  approvalStatusClassName,
  coerceApprovalAmount,
  formatApprovalAmount,
  getApprovalSourceEntityType,
  getApprovalSourceHref,
  resolveApprovalAmount,
} from '@/app/approvals/approval-display';
import { ApprovalSourceOpenButton } from '@/app/approvals/components/approval-source-open-button';

function formatDate(value?: string): string | null {
  if (!value) return null;
  try {
    return format(parseISO(value), 'd MMM yyyy');
  } catch {
    return value;
  }
}

function personName(person?: { name?: string; surname?: string; email?: string }): string {
  const name = `${person?.name ?? ''} ${person?.surname ?? ''}`.trim();
  return name || person?.email || '';
}

export function ApprovalRowCardSkeleton() {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardContent className="flex min-h-[220px] flex-col justify-between p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
        </div>
        <Skeleton className="mt-3 h-8 w-28 rounded-md" />
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
  const requester = personName(approval.requester);
  const amountValue = coerceApprovalAmount(resolveApprovalAmount(approval));
  const amountLabel =
    amountValue != null && amountValue > 0
      ? formatApprovalAmount(amountValue, approval.currency)
      : undefined;
  const sourceHref = getApprovalSourceHref(approval);
  const sourceType = getApprovalSourceEntityType(approval);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(approval)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(approval);
        }
      }}
      className="h-full cursor-pointer rounded-lg border border-border bg-background transition-colors hover:border-violet-300"
    >
      <CardContent className="flex h-full min-h-[220px] flex-col justify-between p-4">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {approval.approvalReference || `APR-${approval.uid}`}
            </p>
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {approval.priority ? (
                <Badge
                  variant="outline"
                  className={cn('capitalize', approvalPriorityClassName(approval.priority))}
                >
                  {approval.priority}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className={cn('uppercase', approvalStatusClassName(approval.status))}
              >
                {approval.status}
              </Badge>
            </div>
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">{approval.title}</p>
          {approval.description ? (
            <p className="mt-2 line-clamp-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {approval.description}
            </p>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2">
              <FileText className="size-4 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <p className="text-[11px] text-blue-700">Type</p>
                <p className="truncate text-sm font-medium text-foreground">
                  {formatApprovalTypeLabel(approval.type)}
                </p>
              </div>
            </div>
            {amountLabel ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
                <DollarSign className="size-4 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="text-[11px] text-emerald-700">Amount</p>
                  <p className="truncate text-sm font-medium text-foreground">{amountLabel}</p>
                </div>
              </div>
            ) : deadline ? (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2',
                  approval.isOverdue ? 'bg-red-50' : 'bg-orange-50',
                )}
              >
                <Clock
                  className={cn(
                    'size-4 shrink-0',
                    approval.isOverdue ? 'text-red-600' : 'text-orange-600',
                  )}
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-[11px]',
                      approval.isOverdue ? 'text-red-700' : 'text-orange-700',
                    )}
                  >
                    {approval.isOverdue ? 'Overdue' : 'Deadline'}
                  </p>
                  <p className="truncate text-sm font-medium text-foreground">{deadline}</p>
                </div>
              </div>
            ) : null}
          </div>
          {amountLabel && deadline ? (
            <div
              className={cn(
                'mt-2 flex items-center gap-2 rounded-xl px-3 py-2',
                approval.isOverdue ? 'bg-red-50' : 'bg-orange-50',
              )}
            >
              <Clock
                className={cn(
                  'size-4 shrink-0',
                  approval.isOverdue ? 'text-red-600' : 'text-orange-600',
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-[11px]',
                    approval.isOverdue ? 'text-red-700' : 'text-orange-700',
                  )}
                >
                  {approval.isOverdue ? 'Overdue' : 'Deadline'}
                </p>
                <p className="truncate text-sm font-medium text-foreground">{deadline}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
            {submitted ? (
              <p className="flex items-center gap-1.5">
                <Calendar className="size-3.5 shrink-0" />
                Submitted: {submitted}
              </p>
            ) : null}
            {requester ? (
              <p className="flex items-center gap-1.5">
                <User className="size-3.5 shrink-0" />
                {requester}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ApprovalSourceOpenButton href={sourceHref} entityType={sourceType} />
            <span className="text-xs italic text-blue-600">View details</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
