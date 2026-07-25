'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDailyProductivity, useUserTarget } from '@/api/hooks';
import {
  ReportProgressBar,
  getProgressColorClasses,
} from '@/app/staff/components/report-progress-bar';
import type {
  ReportsTargetMetricCell,
  ReportsTargetRow,
} from '@/app/reports/lib/reports-target-row';
import { enrichRowWithTargetDashboard } from '@/app/reports/lib/reports-target-row';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DialogCloseButton } from '@/components/dialog-close-button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getTargetWarningHistory,
  summarizeTargetWarnings,
} from '@/lib/target-warnings-summary';
import { cn } from '@/lib/utils';

const WARNING_BADGE: Record<1 | 2 | 3, string> = {
  1: 'bg-green-100 text-green-800 border-green-200/80',
  2: 'bg-amber-100 text-amber-900 border-amber-200/80',
  3: 'bg-red-100 text-red-800 border-red-200/80',
};

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
  const cur = cell.current.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const tgt = cell.target.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (currency) return `${currency} ${cur} / ${tgt}`;
  return `${cur} / ${tgt}`;
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function ModalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="border-b border-border pb-1.5 text-sm font-semibold text-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetricDetail({
  label,
  cell,
  formatValue,
}: {
  label: string;
  cell: ReportsTargetMetricCell;
  formatValue: (cell: ReportsTargetMetricCell) => string;
}) {
  const colors = getProgressColorClasses(cell.progress);
  return (
    <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn('text-xs font-semibold tabular-nums', colors.text)}>
          {cell.target > 0 ? `${cell.progress}%` : '—'}
        </span>
      </div>
      <p className="text-sm font-medium tabular-nums text-foreground">{formatValue(cell)}</p>
      <ReportProgressBar value={cell.progress} />
    </div>
  );
}

export interface ReportsTargetDetailDialogProps {
  row: ReportsTargetRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Toolbar date range for calls/leads review strip. Null when all-time. */
  reviewStartYmd: string | null;
  reviewEndYmd: string | null;
}

export function ReportsTargetDetailDialog({
  row,
  open,
  onOpenChange,
  reviewStartYmd,
  reviewEndYmd,
}: ReportsTargetDetailDialogProps) {
  const targetQuery = useUserTarget(row?.ref ?? null, {
    enabled: open && !!row?.ref,
  });

  const displayRow =
    row && targetQuery.data?.userTarget
      ? enrichRowWithTargetDashboard(row, targetQuery.data.userTarget)
      : row;

  const hasReviewRange = !!reviewStartYmd && !!reviewEndYmd;
  const productivityQuery = useDailyProductivity(
    row?.ref ?? null,
    reviewStartYmd,
    reviewEndYmd,
    { enabled: open && !!row?.ref && hasReviewRange }
  );

  const warnings = displayRow?.targetWarnings ?? null;
  const summary = summarizeTargetWarnings(warnings);
  const history = getTargetWarningHistory(warnings);

  const reviewDays = productivityQuery.data?.days ?? [];
  const reviewAvg = (() => {
    const scored = reviewDays.filter((d) => d.score != null);
    if (scored.length === 0) return null;
    const sum = scored.reduce((acc, d) => acc + (d.score ?? 0), 0);
    return Math.round(sum / scored.length);
  })();
  const reviewCallsAvg = (() => {
    const vals = reviewDays
      .map((d) => d.components?.callsPct)
      .filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  })();
  const reviewLeadsAvg = (() => {
    const vals = reviewDays
      .map((d) => d.components?.leadsPct)
      .filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] w-full max-w-[calc(100%-2rem)] flex-col p-4 pt-12 pr-14 sm:max-h-[90vh] sm:max-w-2xl sm:p-6"
        data-tour="reports-target-detail-dialog"
      >
        <div className="absolute top-4 right-4 z-10">
          <DialogCloseButton />
        </div>
        <DialogHeader className="shrink-0">
          <DialogTitle>{displayRow ? displayRow.name : 'Target details'}</DialogTitle>
        </DialogHeader>

        {displayRow ? (
          <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pt-2">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 shrink-0">
                <AvatarImage src={displayRow.photoURL ?? undefined} alt="" />
                <AvatarFallback>{initials(displayRow.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">
                  {displayRow.name}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {displayRow.branch ?? displayRow.email}
                </p>
                {displayRow.periodLabel ? (
                  <p className="text-xs text-muted-foreground/80">{displayRow.periodLabel}</p>
                ) : null}
              </div>
              {summary.currentLevel === 1 ||
              summary.currentLevel === 2 ||
              summary.currentLevel === 3 ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'ml-auto gap-1 shrink-0 text-[10px] font-medium',
                    WARNING_BADGE[summary.currentLevel]
                  )}
                >
                  <AlertTriangle className="size-3" />
                  Level {summary.currentLevel}
                </Badge>
              ) : null}
            </div>

            {targetQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : null}

            <ModalSection title="Sales">
              <MetricDetail
                label="Sales amount"
                cell={displayRow.sales}
                formatValue={formatSales}
              />
            </ModalSection>

            <ModalSection title="Calls & leads">
              <div className="grid gap-2 sm:grid-cols-2">
                <MetricDetail
                  label="Calls"
                  cell={displayRow.calls}
                  formatValue={(c) =>
                    `${formatCount(c.current)} / ${formatCount(c.target)}`
                  }
                />
                <MetricDetail
                  label="Leads"
                  cell={displayRow.leads}
                  formatValue={(c) =>
                    `${formatCount(c.current)} / ${formatCount(c.target)}`
                  }
                />
              </div>

              {hasReviewRange ? (
                <div className="mt-2 space-y-1.5 rounded-lg border border-border/60 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Review · {reviewStartYmd}
                    {reviewEndYmd !== reviewStartYmd ? ` – ${reviewEndYmd}` : ''}
                  </p>
                  {productivityQuery.isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Avg score</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {reviewAvg != null ? `${reviewAvg}%` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Calls</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {reviewCallsAvg != null ? `${reviewCallsAvg}%` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Leads</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {reviewLeadsAvg != null ? `${reviewLeadsAvg}%` : '—'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </ModalSection>

            <ModalSection title="Hours">
              <MetricDetail
                label="Attendance hours"
                cell={displayRow.hours}
                formatValue={(c) =>
                  `${formatCount(c.current)}h / ${formatCount(c.target)}h`
                }
              />
            </ModalSection>

            <ModalSection title="Warnings history">
              <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>
                  Issued:{' '}
                  <span className="font-medium text-foreground">{summary.totalIssued}</span>
                </span>
                <span>
                  Acknowledged:{' '}
                  <span className="font-medium text-foreground">
                    {summary.totalAcknowledged}
                  </span>
                </span>
                <span>
                  Pending:{' '}
                  <span
                    className={cn(
                      'font-medium',
                      summary.pendingCount > 0 ? 'text-amber-700' : 'text-foreground'
                    )}
                  >
                    {summary.pendingCount}
                  </span>
                </span>
              </div>
              <Separator />
              {history.length === 0 ? (
                <p className="pt-2 text-sm text-muted-foreground">No warning history.</p>
              ) : (
                <ul className="space-y-2 pt-2">
                  {[...history].reverse().map((entry, i) => (
                    <li
                      key={`${entry.level}-${entry.issuedAt}-${i}`}
                      className="rounded-lg border border-border/60 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'gap-1 text-[10px] font-medium',
                            WARNING_BADGE[entry.level]
                          )}
                        >
                          <AlertTriangle className="size-3" />
                          Level {entry.level}
                        </Badge>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {entry.source.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Issued {formatDateTime(entry.issuedAt)}
                      </p>
                      <p
                        className={cn(
                          'text-xs',
                          entry.acknowledgedAt
                            ? 'text-muted-foreground'
                            : 'font-medium text-amber-700'
                        )}
                      >
                        {entry.acknowledgedAt
                          ? `Acknowledged ${formatDateTime(entry.acknowledgedAt)}`
                          : 'Not acknowledged'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </ModalSection>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
