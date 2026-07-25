'use client';

import type { KeyboardEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  ReportProgressBar,
  getProgressColorClasses,
} from '@/app/staff/components/report-progress-bar';
import type { ReportsTargetMetricCell, ReportsTargetRow } from '@/app/reports/lib/reports-target-row';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { summarizeTargetWarnings } from '@/lib/target-warnings-summary';
import { cn } from '@/lib/utils';

const WARNING_BADGE: Record<1 | 2 | 3, string> = {
  1: 'bg-green-100 text-green-800 border-green-200/80',
  2: 'bg-amber-100 text-amber-900 border-amber-200/80',
  3: 'bg-red-100 text-red-800 border-red-200/80',
};

const COL_COUNT = 8;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString();
}

function formatSales(cell: ReportsTargetMetricCell): string {
  const currency = cell.currency?.trim() || '';
  const cur = cell.current.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  const tgt = cell.target.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  if (currency) return `${currency} ${cur} / ${tgt}`;
  return `${cur} / ${tgt}`;
}

function MetricCell({
  cell,
  formatValue,
}: {
  cell: ReportsTargetMetricCell;
  formatValue: (cell: ReportsTargetMetricCell) => string;
}) {
  const colors = getProgressColorClasses(cell.progress);
  return (
    <div className="min-w-[7.5rem] space-y-1.5">
      <p className="text-xs text-muted-foreground tabular-nums">{formatValue(cell)}</p>
      <ReportProgressBar value={cell.progress} />
      <p className={cn('text-xs font-medium tabular-nums', colors.text)}>
        {cell.target > 0 ? `${cell.progress}%` : '—'}
      </p>
    </div>
  );
}

function WarningBadge({ row }: { row: ReportsTargetRow }) {
  const summary = summarizeTargetWarnings(row.targetWarnings);
  const level = summary.currentLevel;
  if (level !== 1 && level !== 2 && level !== 3) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-[10px] font-medium', WARNING_BADGE[level])}
      title={`Performance warning: Level ${level}`}
      aria-label={`Performance warning: Level ${level}`}
    >
      <AlertTriangle className="size-3" />
      Level {level}
    </Badge>
  );
}

function AcknowledgedCell({ row }: { row: ReportsTargetRow }) {
  const summary = summarizeTargetWarnings(row.targetWarnings);
  if (summary.totalIssued === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const notAcked = Math.max(0, summary.totalIssued - summary.totalAcknowledged);
  return (
    <div className="min-w-[5.5rem] space-y-0.5">
      <p className="text-xs font-medium tabular-nums text-foreground">
        {summary.totalAcknowledged} / {summary.totalIssued}
      </p>
      {summary.pendingCount > 0 || notAcked > 0 ? (
        <p className="text-[10px] text-amber-700">
          {summary.pendingCount > 0
            ? `${summary.pendingCount} not acknowledged`
            : `${notAcked} not acknowledged`}
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground">All acknowledged</p>
      )}
    </div>
  );
}

function ReportsTargetsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-10 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-10 w-24" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-10 w-28" />
          </TableCell>
          <TableCell className="hidden lg:table-cell">
            <Skeleton className="h-10 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-10 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-14" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export interface ReportsTargetsTableProps {
  rows: ReportsTargetRow[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: ReportsTargetRow) => void;
}

export function ReportsTargetsTable({
  rows,
  isLoading = false,
  emptyMessage = 'No users with performance targets found.',
  onRowClick,
}: ReportsTargetsTableProps) {
  function handleRowKeyDown(e: KeyboardEvent<HTMLTableRowElement>, row: ReportsTargetRow) {
    if (!onRowClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick(row);
    }
  }

  return (
    <Table data-tour="reports-targets-table">
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[12rem]">User</TableHead>
          <TableHead>Calls</TableHead>
          <TableHead>Leads</TableHead>
          <TableHead className="hidden md:table-cell">Sales</TableHead>
          <TableHead className="hidden lg:table-cell">Hours</TableHead>
          <TableHead>Achievement</TableHead>
          <TableHead>Warnings</TableHead>
          <TableHead>Acknowledged</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <ReportsTargetsTableSkeleton />
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={COL_COUNT} className="h-24 text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => {
            const achievementColors = getProgressColorClasses(row.achievement);
            return (
              <TableRow
                key={row.key}
                className={cn(
                  onRowClick &&
                    'cursor-pointer transition-colors hover:bg-muted/50'
                )}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => handleRowKeyDown(e, row)}
                data-tour="reports-targets-row"
              >
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={row.photoURL ?? undefined} alt="" />
                      <AvatarFallback className="text-[10px]">
                        {initials(row.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.branch ? row.branch : row.email}
                      </p>
                      {row.periodLabel ? (
                        <p className="truncate text-[10px] text-muted-foreground/80">
                          {row.periodLabel}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <MetricCell
                    cell={row.calls}
                    formatValue={(c) => `${formatCount(c.current)} / ${formatCount(c.target)}`}
                  />
                </TableCell>
                <TableCell>
                  <MetricCell
                    cell={row.leads}
                    formatValue={(c) => `${formatCount(c.current)} / ${formatCount(c.target)}`}
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <MetricCell cell={row.sales} formatValue={formatSales} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <MetricCell
                    cell={row.hours}
                    formatValue={(c) => `${formatCount(c.current)}h / ${formatCount(c.target)}h`}
                  />
                </TableCell>
                <TableCell>
                  <div className="min-w-[5rem] space-y-1.5">
                    <ReportProgressBar value={row.achievement} />
                    <p className={cn('text-sm font-semibold tabular-nums', achievementColors.text)}>
                      {row.achievement}%
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <WarningBadge row={row} />
                </TableCell>
                <TableCell>
                  <AcknowledgedCell row={row} />
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
