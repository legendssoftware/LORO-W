'use client';

import { useMemo } from 'react';
import type { VisitListItem } from '@/api/types/visits';
import type { VisitPlanScheduleSlot } from '@/api/endpoints/user';
import {
  aggregateActivitySummary,
  buildActivityDetailRows,
  formatVisitDurationTotal,
} from '@/app/reports/lib/reports-target-detail-aggregates';
import { toDonutSlices } from '@/app/reports/lib/reports-dashboard-chart-helpers';
import { formatVisitActionTime } from '@/app/visualiser/lib/journey-visit-actions';
import { ReportDonutChart } from '@/components/charts/report-donut-chart';
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
import { humanizeReportLabel } from '@/lib/utils/report-labels';
import { cn } from '@/lib/utils';

function SummaryStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

const KIND_BADGE: Record<'call' | 'visit', string> = {
  call: 'border-sky-200 bg-sky-50 text-sky-950',
  visit: 'border-emerald-200 bg-emerald-50 text-emerald-950',
};

export interface ReportsTargetActivityAnalysisProps {
  checkIns: VisitListItem[];
  planSlotsInRange: VisitPlanScheduleSlot[];
  isLoading: boolean;
}

export function ReportsTargetActivityAnalysis({
  checkIns,
  planSlotsInRange,
  isLoading,
}: ReportsTargetActivityAnalysisProps) {
  const summary = useMemo(
    () => aggregateActivitySummary(checkIns, planSlotsInRange),
    [checkIns, planSlotsInRange]
  );

  const rows = useMemo(() => buildActivityDetailRows(checkIns), [checkIns]);

  const outcomeChart = useMemo(
    () => toDonutSlices(summary.byOutcome),
    [summary.byOutcome]
  );

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (checkIns.length === 0 && summary.plannedVisitCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity recorded in this range.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryStat
          label="Calls"
          value={String(summary.callCount)}
          sub={
            summary.callTotalMinutes > 0
              ? formatVisitDurationTotal(summary.callTotalMinutes)
              : undefined
          }
        />
        <SummaryStat
          label="Visits"
          value={String(summary.visitCount)}
          sub={
            summary.visitTotalMinutes > 0
              ? formatVisitDurationTotal(summary.visitTotalMinutes)
              : undefined
          }
        />
        <SummaryStat
          label="Planned visits"
          value={String(summary.plannedVisitCount)}
          sub={
            planSlotsInRange.length > 0
              ? `${planSlotsInRange.length} day${planSlotsInRange.length === 1 ? '' : 's'} scheduled`
              : undefined
          }
        />
        <SummaryStat
          label="Avg duration"
          value={
            summary.avgDurationMinutes > 0
              ? formatVisitDurationTotal(summary.avgDurationMinutes)
              : '—'
          }
        />
        <SummaryStat
          label="Top outcome"
          value={
            summary.byOutcome[0]
              ? `${humanizeReportLabel(summary.byOutcome[0].name)} (${summary.byOutcome[0].value})`
              : '—'
          }
        />
      </div>

      {outcomeChart.slices.length > 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Outcomes
          </p>
          <ReportDonutChart
            config={outcomeChart.config}
            data={outcomeChart.slices}
            centerPrimary={String(outcomeChart.total)}
            centerSecondary="Activities"
            legendMaxItems={outcomeChart.slices.length}
            tooltipClassName="min-w-[14rem]"
            className="max-h-[260px]"
          />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No check-ins or calls logged in this range.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="min-w-[10rem]">Location</TableHead>
                <TableHead>Follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatVisitActionTime(row.checkInTime) ?? '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {row.checkOutTime
                      ? (formatVisitActionTime(row.checkOutTime) ?? '—')
                      : 'In progress'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'border px-1.5 py-0 text-[10px] font-medium capitalize',
                        KIND_BADGE[row.kind]
                      )}
                    >
                      {row.kind}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate text-sm font-medium">
                    {row.contactLabel}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">{row.durationLabel}</TableCell>
                  <TableCell className="max-w-[10rem] truncate text-sm text-muted-foreground">
                    {row.outcome ?? '—'}
                  </TableCell>
                  <TableCell className="max-w-[12rem] text-sm">
                    {row.locationHref ? (
                      <a
                        href={row.locationHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:opacity-80"
                      >
                        {row.locationLabel}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{row.locationLabel}</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[8rem] truncate text-xs text-muted-foreground">
                    {row.followUp ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
