'use client';

import { Fragment, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import type {
  PolicyReportRow,
  PolicyReportSortKey,
  PolicyStatus,
} from '@/api/types/performance-policy';
import { ReportProgressBar } from '@/app/staff/components/report-progress-bar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  formatActualOfExpected,
  formatPolicyCount,
  formatPolicyPct,
  policyStatusLabel,
  POLICY_STANDARD_LABEL,
} from '../lib/reports-policy-format';

const STATUS_BADGE: Record<PolicyStatus, string> = {
  meets_all: 'bg-green-100 text-green-800 border-green-200/80',
  below_standard: 'bg-red-100 text-red-800 border-red-200/80',
  not_measurable: 'bg-muted text-muted-foreground border-border',
};

const COL_COUNT = 11;

interface ReportsPolicyTableProps {
  rows: readonly PolicyReportRow[];
  isLoading: boolean;
  sort: PolicyReportSortKey;
  order: 'asc' | 'desc';
  onSortChange: (key: PolicyReportSortKey) => void;
  /** Pay columns only make sense when at least one row carries pay. */
  showPay: boolean;
}

function SortableHead({
  label,
  sortKey,
  active,
  order,
  onSortChange,
  className,
}: {
  label: string;
  sortKey: PolicyReportSortKey;
  active: PolicyReportSortKey;
  order: 'asc' | 'desc';
  onSortChange: (key: PolicyReportSortKey) => void;
  className?: string;
}) {
  const isActive = sortKey === active;
  const Icon = !isActive ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={className}
      aria-sort={isActive ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      >
        {label}
        <Icon className={cn('size-3', !isActive && 'opacity-40')} aria-hidden />
      </button>
    </TableHead>
  );
}

function displayName(row: PolicyReportRow): string {
  return [row.user.name, row.user.surname].filter(Boolean).join(' ').trim() || `User ${row.user.uid}`;
}

function PctCell({ pct, detail }: { pct: number | null; detail: string }) {
  return (
    <div className="min-w-[6.5rem] space-y-1">
      <p className="text-xs font-medium tabular-nums text-foreground">{detail}</p>
      {pct == null ? (
        <p className="text-[10px] text-muted-foreground">No quota</p>
      ) : (
        <>
          <ReportProgressBar value={Math.round(pct * 100)} />
          <p className="text-[10px] tabular-nums text-muted-foreground">{formatPolicyPct(pct)}</p>
        </>
      )}
    </div>
  );
}

function ExpandedDetail({ row }: { row: PolicyReportRow }) {
  return (
    <div className="grid gap-4 p-3 text-xs sm:grid-cols-3">
      <div>
        <p className="mb-1.5 font-medium text-foreground">Standards</p>
        <ul className="space-y-1">
          {row.standards.map((standard) => (
            <li key={standard.key} className="flex items-center justify-between gap-3">
              <span>{POLICY_STANDARD_LABEL[standard.key]}</span>
              <span
                className={cn(
                  'font-medium',
                  standard.met === true && 'text-green-700',
                  standard.met === false && 'text-red-700',
                  standard.met == null && 'text-muted-foreground',
                )}
              >
                {standard.met == null ? 'n/a' : standard.met ? 'Met' : 'Not met'}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1.5 font-medium text-foreground">Verification</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>Visits logged: {formatPolicyCount(row.visits.logged)}</li>
          <li>Visits verified: {formatPolicyCount(row.visits.verified)}</li>
          <li>Incomplete visits: {formatPolicyCount(row.incompleteVisits)}</li>
          <li>Flagged visits: {formatPolicyCount(row.flaggedVisits)}</li>
          <li>Calls logged: {formatPolicyCount(row.calls.logged)}</li>
        </ul>
      </div>
      <div>
        <p className="mb-1.5 font-medium text-foreground">Targets and exceptions</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>
            Quota from:{' '}
            {row.quotaSource === 'current'
              ? 'current target'
              : row.quotaSource === 'history'
                ? 'archived month target'
                : row.quotaSource === 'mixed'
                  ? 'current and archived targets'
                  : 'no target set'}
          </li>
          <li>Approved exceptions: {formatPolicyCount(row.approvedExceptions)}</li>
          <li>Pending exceptions: {formatPolicyCount(row.pendingExceptions)}</li>
          <li>Agreement: {row.signed ? 'signed' : 'not signed'}</li>
          {row.payAmount != null ? <li>Pay amount: {formatPolicyCount(row.payAmount)}</li> : null}
        </ul>
      </div>
    </div>
  );
}

export function ReportsPolicyTable({
  rows,
  isLoading,
  sort,
  order,
  onSortChange,
  showPay,
}: ReportsPolicyTableProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  function toggle(clerkUserId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(clerkUserId)) next.delete(clerkUserId);
      else next.add(clerkUserId);
      return next;
    });
  }

  const sortProps = { active: sort, order, onSortChange };

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <SortableHead label="Employee" sortKey="name" {...sortProps} />
            <SortableHead label="Status" sortKey="status" {...sortProps} />
            <SortableHead label="Days" sortKey="expectedDays" {...sortProps} />
            <SortableHead label="Visits" sortKey="visitsPct" {...sortProps} />
            <SortableHead label="Calls" sortKey="callsPct" {...sortProps} />
            <SortableHead label="Activity" sortKey="activityPct" {...sortProps} />
            <TableHead>Leads</TableHead>
            <TableHead>Quotes</TableHead>
            <SortableHead label="Flagged" sortKey="flaggedVisits" {...sortProps} />
            {showPay ? (
              <SortableHead label="Pay %" sortKey="payPct" {...sortProps} />
            ) : (
              <TableHead>Signed</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 6 }, (_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell colSpan={COL_COUNT}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : null}
          {!isLoading && rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COL_COUNT} className="py-10 text-center text-sm text-muted-foreground">
                No employees match these filters.
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((row) => {
            const isOpen = expanded.has(row.user.clerkUserId);
            return (
              <Fragment key={row.user.clerkUserId}>
                <TableRow className="cursor-pointer" onClick={() => toggle(row.user.clerkUserId)}>
                  <TableCell>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Hide' : 'Show'} details for ${displayName(row)}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggle(row.user.clerkUserId);
                      }}
                    >
                      {isOpen ? (
                        <ChevronDown className="size-4" aria-hidden />
                      ) : (
                        <ChevronRight className="size-4" aria-hidden />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{displayName(row)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_BADGE[row.status]}>
                      {policyStatusLabel(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatPolicyCount(row.expectedDays)}</TableCell>
                  <TableCell>
                    <PctCell pct={row.visitsPct} detail={formatActualOfExpected(row.visits.verified, row.visits.expected)} />
                  </TableCell>
                  <TableCell>
                    <PctCell pct={row.callsPct} detail={formatActualOfExpected(row.calls.qualifying, row.calls.expected)} />
                  </TableCell>
                  <TableCell className="tabular-nums">{formatPolicyPct(row.activityPct)}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatPolicyCount(row.newLeads)}
                    <span className="ml-1 text-[10px] text-muted-foreground">{formatPolicyPct(row.leadSharePct)}</span>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatPolicyCount(row.quotations)}</TableCell>
                  <TableCell className={cn('tabular-nums', row.flaggedVisits > 0 && 'font-medium text-amber-700')}>
                    {formatPolicyCount(row.flaggedVisits)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {showPay ? formatPolicyPct(row.payPct) : row.signed ? 'Yes' : 'No'}
                  </TableCell>
                </TableRow>
                {isOpen ? (
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell colSpan={COL_COUNT} className="p-0">
                      <ExpandedDetail row={row} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
