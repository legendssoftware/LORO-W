'use client';

import { Fragment, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  ReportProgressBar,
  getProgressColorClasses,
} from '@/app/staff/components/report-progress-bar';
import { formatReportCurrencyCode } from '@/app/reports/lib/reports-chart-format';
import {
  sumUniqueErpSales,
  type ReportsTargetMetricCell,
  type ReportsTargetRow,
} from '@/app/reports/lib/reports-target-row';
import {
  quotationsColumnLabel,
  salesColumnLabel,
  type ReportsTargetsCurrencyView,
} from '@/app/reports/lib/reports-target-currency';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

const COL_COUNT = 14;

const PRODUCTIVITY_COLUMN_HINT =
  'Target-based score (0–100) from HR targets and ERP activity. Not the same as Utilization % on the dashboard.';

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
  const currency = formatReportCurrencyCode(cell.currency);
  const cur = cell.current.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  const tgt = cell.target.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  return `${currency} ${cur} / ${tgt}`;
}

function formatQuotationsAmount(cell: ReportsTargetMetricCell): string {
  const amount = cell.amountCurrent ?? 0;
  const currency = formatReportCurrencyCode(cell.currency);
  return `${currency} ${Math.round(amount).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function formatQuoteCount(count: number): string {
  const n = Math.round(count);
  if (!Number.isFinite(n) || n <= 0) return '0 quotes';
  return n === 1 ? '1 quote' : `${n.toLocaleString()} quotes`;
}

function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return '0 km';
  return `${km.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
}

function formatVisitClaimLine(checkIns: number, claimAmount: number): string {
  const count = Math.round(checkIns);
  const label = count === 1 ? '1 check-in' : `${formatCount(count)} check-ins`;
  const claims = Math.round(claimAmount);
  return `${label} · R ${claims.toLocaleString()}`;
}

function CountCell({ value, pending }: { value: number; pending?: boolean }) {
  if (pending) return <MetricCellSkeleton />;
  return <p className="text-sm font-medium tabular-nums text-foreground">{formatCount(value)}</p>;
}

function QuotationsMetricCell({
  cell,
  quotationCountAvailable = true,
  engagementError = false,
}: {
  cell: ReportsTargetMetricCell;
  quotationCountAvailable?: boolean;
  engagementError?: boolean;
}) {
  const colors = getProgressColorClasses(cell.progress);
  return (
    <div className="min-w-[7.5rem] space-y-1.5">
      {engagementError ? (
        <p className="text-xs font-medium tabular-nums text-muted-foreground" title="Could not load quote count">
          —
        </p>
      ) : quotationCountAvailable ? (
        <p className="text-xs font-medium text-foreground tabular-nums">
          {formatQuoteCount(cell.current)}
        </p>
      ) : (
        <p className="text-xs font-medium tabular-nums text-muted-foreground" title="Quote count unavailable">
          —
        </p>
      )}
      <p className="text-[10px] tabular-nums text-muted-foreground">
        {formatQuotationsAmount(cell)}
      </p>
      <ReportProgressBar value={cell.progress} />
      {cell.target > 0 ? (
        <p className={cn('text-xs font-medium tabular-nums', colors.text)}>
          {cell.progress}%
        </p>
      ) : (
        <p className="text-xs font-medium tabular-nums text-muted-foreground">—</p>
      )}
    </div>
  );
}

function TravelMetricCell({
  row,
}: {
  row: ReportsTargetRow;
}) {
  const cell = row.travel ?? {
    distanceKm: 0,
    visitCount: row.visits.current,
    petrolClaimCount: 0,
    petrolClaimAmount: 0,
    fuelAllowance: 0,
    progress: 0,
  };
  const colors = getProgressColorClasses(cell.progress);
  return (
    <div className="min-w-[7.5rem] space-y-1.5">
      <p className="text-xs font-medium text-foreground tabular-nums">
        {formatDistanceKm(cell.distanceKm)}
      </p>
      <p className="text-[10px] tabular-nums text-muted-foreground">
        {formatVisitClaimLine(cell.visitCount, cell.petrolClaimAmount)}
      </p>
      <ReportProgressBar value={cell.progress} />
      {cell.fuelAllowance > 0 ? (
        <p className={cn('text-xs font-medium tabular-nums', colors.text)}>
          {cell.progress}%
        </p>
      ) : (
        <p className="text-xs font-medium tabular-nums text-muted-foreground">—</p>
      )}
    </div>
  );
}

function MetricCell({
  cell,
  formatValue,
  done = false,
}: {
  cell: ReportsTargetMetricCell;
  formatValue: (cell: ReportsTargetMetricCell) => string;
  /** This column's count has reached its own target. */
  done?: boolean;
}) {
  const displayProgress = done ? 100 : cell.progress;
  const colors = getProgressColorClasses(displayProgress);
  return (
    <div className="min-w-[7.5rem] space-y-1.5">
      <p className="text-xs text-muted-foreground tabular-nums">{formatValue(cell)}</p>
      <ReportProgressBar value={displayProgress} />
      {cell.target > 0 ? (
        <p className={cn('text-xs font-medium tabular-nums', colors.text)}>
          {done ? 'Done' : `${displayProgress}%`}
        </p>
      ) : (
        <p className="text-xs font-medium tabular-nums text-muted-foreground">—</p>
      )}
    </div>
  );
}

function ProductivityCell({ row }: { row: ReportsTargetRow }) {
  const { score, isLoading } = row.productivity;
  if (isLoading) {
    return <Skeleton className="h-10 w-16" />;
  }
  if (score == null) {
    return (
      <span
        className="text-xs text-muted-foreground"
        title={PRODUCTIVITY_COLUMN_HINT}
      >
        —
      </span>
    );
  }
  const colors = getProgressColorClasses(score);
  return (
    <div
      className="min-w-[5rem] space-y-1.5"
      title={PRODUCTIVITY_COLUMN_HINT}
    >
      <ReportProgressBar value={score} />
      <p className={cn('text-sm font-semibold tabular-nums', colors.text)}>
        {score}%
      </p>
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
            <Skeleton className="h-4 w-8" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-8" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-8" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-8" />
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
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-10 w-28" />
          </TableCell>
          <TableCell className="hidden lg:table-cell">
            <Skeleton className="h-10 w-24" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-10 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-10 w-16" />
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
  currencyView?: ReportsTargetsCurrencyView;
  /** Skeleton Calls/Visits/Leads/Quotations while engagement-range is in flight (date filter). */
  engagementOverlayPending?: boolean;
  /** Skeleton Quotations only while target-period engagement loads (all-time). */
  quotationEngagementPending?: boolean;
  /** Engagement-range failed — avoid showing misleading 0 quote count. */
  quotationEngagementError?: boolean;
  /** Skeleton Hours while attendance overlay is in flight. */
  hoursOverlayPending?: boolean;
  /** Skeleton Travel while travel-range is in flight. */
  travelOverlayPending?: boolean;
  /** True when engagement-range succeeded and quote count is available. */
  quotationCountAvailable?: boolean;
  /** Managed staff rows for each team leader, keyed by the leader's user id. */
  teamMembersByLeaderId?: Map<number, ReportsTargetRow[]>;
}

function ratioPercent(current: number, target: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round((current / target) * 100);
}

function TeamMetricBar({
  label,
  valueLabel,
  progress,
  loading = false,
}: {
  label: string;
  valueLabel: string;
  progress: number;
  loading?: boolean;
}) {
  const colors = getProgressColorClasses(progress);
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn('text-xs font-semibold tabular-nums', colors.text)}>{progress}%</p>
      </div>
      {loading ? <Skeleton className="h-2 w-full" /> : <ReportProgressBar value={progress} />}
      <p className="truncate text-xs tabular-nums text-foreground">{valueLabel}</p>
    </div>
  );
}

function TeamTargetsPanel({ members }: { members: ReportsTargetRow[] }) {
  const salesCurrent = sumUniqueErpSales(members);
  const salesTarget = members.reduce((sum, row) => sum + row.sales.target, 0);
  const callsCurrent = members.reduce((sum, row) => sum + row.calls.current, 0);
  const callsTarget = members.reduce((sum, row) => sum + row.calls.target, 0);
  const visitsCurrent = members.reduce((sum, row) => sum + row.visits.current, 0);
  const visitsTarget = members.reduce((sum, row) => sum + row.visits.target, 0);
  const leadsCurrent = members.reduce((sum, row) => sum + row.leads.current, 0);
  const leadsTarget = members.reduce((sum, row) => sum + row.leads.target, 0);
  const quotesCurrent = members.reduce((sum, row) => sum + row.quotations.current, 0);
  const quotesTarget = members.reduce((sum, row) => sum + row.quotations.target, 0);
  const hoursCurrent = members.reduce((sum, row) => sum + row.hours.current, 0);
  const hoursTarget = members.reduce((sum, row) => sum + row.hours.target, 0);
  const distanceKm = members.reduce((sum, row) => sum + row.travel.distanceKm, 0);
  const fuelAllowance = members.reduce((sum, row) => sum + row.travel.fuelAllowance, 0);
  const achievement =
    members.length === 0
      ? 0
      : Math.round(members.reduce((sum, row) => sum + row.achievement, 0) / members.length);
  const salesLoading = members.some((row) => row.salesLoading === true);
  const currency = formatReportCurrencyCode(members.find((row) => row.sales.currency)?.sales.currency);
  const people = members.length === 1 ? '1 person' : `${members.length} people`;

  return (
    <div className="space-y-3 rounded-lg bg-muted/40 p-3">
      <p className="text-xs font-medium text-muted-foreground">Team targets · {people}</p>
      <p className="text-xs tabular-nums text-muted-foreground">
        Telephone {formatCount(members.reduce((sum, row) => sum + row.activity.telephone, 0))}
        {' · '}WhatsApp {formatCount(members.reduce((sum, row) => sum + row.activity.whatsapp, 0))}
        {' · '}Email {formatCount(members.reduce((sum, row) => sum + row.activity.email, 0))}
        {' · '}Landline {formatCount(members.reduce((sum, row) => sum + row.activity.landline, 0))}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TeamMetricBar
          label="Sales"
          loading={salesLoading}
          progress={ratioPercent(salesCurrent, salesTarget)}
          valueLabel={`${currency} ${Math.round(salesCurrent).toLocaleString()} / ${Math.round(salesTarget).toLocaleString()}`}
        />
        <TeamMetricBar
          label="All Activity"
          progress={ratioPercent(callsCurrent, callsTarget)}
          valueLabel={`${formatCount(callsCurrent)} / ${formatCount(callsTarget)}`}
        />
        <TeamMetricBar
          label="Visits"
          progress={ratioPercent(visitsCurrent, visitsTarget)}
          valueLabel={`${formatCount(visitsCurrent)} / ${formatCount(visitsTarget)}`}
        />
        <TeamMetricBar
          label="Leads"
          progress={ratioPercent(leadsCurrent, leadsTarget)}
          valueLabel={`${formatCount(leadsCurrent)} / ${formatCount(leadsTarget)}`}
        />
        <TeamMetricBar
          label="Quotations"
          progress={ratioPercent(quotesCurrent, quotesTarget)}
          valueLabel={`${formatCount(quotesCurrent)} / ${formatCount(quotesTarget)}`}
        />
        <TeamMetricBar
          label="Hours"
          progress={ratioPercent(hoursCurrent, hoursTarget)}
          valueLabel={`${formatCount(hoursCurrent)}h / ${formatCount(hoursTarget)}h`}
        />
        <TeamMetricBar
          label="Travel"
          progress={ratioPercent(distanceKm, fuelAllowance)}
          valueLabel={`${formatDistanceKm(distanceKm)} / ${formatDistanceKm(fuelAllowance)}`}
        />
        <TeamMetricBar
          label="Achievement"
          progress={achievement}
          valueLabel={`${achievement}% average`}
        />
      </div>
    </div>
  );
}

function MetricCellSkeleton() {
  return <Skeleton className="h-10 w-24" />;
}

export function ReportsTargetsTable({
  rows,
  isLoading = false,
  emptyMessage = 'No users with performance targets found.',
  onRowClick,
  currencyView = 'set',
  engagementOverlayPending = false,
  quotationEngagementPending = false,
  quotationEngagementError = false,
  hoursOverlayPending = false,
  travelOverlayPending = false,
  quotationCountAvailable = true,
  teamMembersByLeaderId,
}: ReportsTargetsTableProps) {
  const [expandedLeaderIds, setExpandedLeaderIds] = useState<Set<number>>(() => new Set());

  function teamFor(row: ReportsTargetRow): ReportsTargetRow[] {
    return teamMembersByLeaderId?.get(row.userId) ?? [];
  }

  function toggleLeader(userId: number) {
    setExpandedLeaderIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function handleRowKeyDown(e: KeyboardEvent<HTMLTableRowElement>, row: ReportsTargetRow) {
    const team = teamFor(row);
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (team.length > 0) {
      e.preventDefault();
      toggleLeader(row.userId);
      return;
    }
    if (!onRowClick) return;
    e.preventDefault();
    onRowClick(row);
  }

  return (
    <Table data-tour="reports-targets-table">
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[12rem]">User</TableHead>
          <TableHead title="Countable telephone, landline, email, and WhatsApp versus the call quota">
            All Activity
          </TableHead>
          <TableHead title="Telephone logs that are not landline-only, including voicemail and no-answer">
            Telephone
          </TableHead>
          <TableHead>WhatsApp</TableHead>
          <TableHead>Email</TableHead>
          <TableHead title="Telephone logs with a landline number and no cell number">Landline</TableHead>
          <TableHead title="Physical visits to a location">Visits</TableHead>
          <TableHead>Leads</TableHead>
          <TableHead className="hidden md:table-cell">{quotationsColumnLabel(currencyView)}</TableHead>
          <TableHead className="hidden md:table-cell">{salesColumnLabel(currencyView)}</TableHead>
          <TableHead className="hidden lg:table-cell">Hours</TableHead>
          <TableHead className="hidden md:table-cell">Travel</TableHead>
          <TableHead
            title={PRODUCTIVITY_COLUMN_HINT}
          >
            Productivity
          </TableHead>
          <TableHead>Achievement</TableHead>
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
            const team = teamFor(row);
            const isLeader = team.length > 0;
            const isExpanded = isLeader && expandedLeaderIds.has(row.userId);
            return (
              <Fragment key={row.key}>
              <TableRow
                className={cn(
                  (onRowClick || isLeader) &&
                    'cursor-pointer transition-colors hover:bg-muted/50'
                )}
                role={!isLeader && onRowClick ? 'button' : undefined}
                tabIndex={!isLeader && onRowClick ? 0 : undefined}
                aria-expanded={isLeader ? isExpanded : undefined}
                onClick={() => {
                  if (isLeader) {
                    toggleLeader(row.userId);
                    return;
                  }
                  onRowClick?.(row);
                }}
                onKeyDown={(e) => handleRowKeyDown(e, row)}
                data-tour="reports-targets-row"
              >
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2.5">
                    {isLeader ? (
                      <ChevronDown
                        className={cn(
                          'size-4 shrink-0 text-muted-foreground transition-transform',
                          isExpanded && 'rotate-180'
                        )}
                        aria-hidden
                      />
                    ) : null}
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
                      {isLeader ? (
                        <button
                          type="button"
                          className="text-[10px] font-medium text-primary hover:underline"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRowClick?.(row);
                          }}
                        >
                          Open profile
                        </button>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {engagementOverlayPending ? (
                    <MetricCellSkeleton />
                  ) : (
                    <MetricCell
                      cell={row.calls}
                      done={row.calls.target > 0 && row.calls.current >= row.calls.target}
                      formatValue={(c) => `${formatCount(c.current)} / ${formatCount(c.target)}`}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <CountCell value={row.activity.telephone} pending={engagementOverlayPending} />
                </TableCell>
                <TableCell>
                  <CountCell value={row.activity.whatsapp} pending={engagementOverlayPending} />
                </TableCell>
                <TableCell>
                  <CountCell value={row.activity.email} pending={engagementOverlayPending} />
                </TableCell>
                <TableCell>
                  <CountCell value={row.activity.landline} pending={engagementOverlayPending} />
                </TableCell>
                <TableCell>
                  {engagementOverlayPending ? (
                    <MetricCellSkeleton />
                  ) : (
                    <MetricCell
                      cell={row.visits}
                      formatValue={(c) => `${formatCount(c.current)} / ${formatCount(c.target)}`}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {engagementOverlayPending ? (
                    <MetricCellSkeleton />
                  ) : (
                    <MetricCell
                      cell={row.leads}
                      done={row.leads.target > 0 && row.leads.current >= row.leads.target}
                      formatValue={(c) => `${formatCount(c.current)} / ${formatCount(c.target)}`}
                    />
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {engagementOverlayPending || quotationEngagementPending ? (
                    <MetricCellSkeleton />
                  ) : (
                    <QuotationsMetricCell
                      cell={row.quotations}
                      quotationCountAvailable={quotationCountAvailable}
                      engagementError={quotationEngagementError}
                    />
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {row.salesLoading ? (
                    <Skeleton className="h-10 w-28" />
                  ) : (
                    <MetricCell cell={row.sales} formatValue={formatSales} />
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {hoursOverlayPending ? (
                    <MetricCellSkeleton />
                  ) : (
                    <MetricCell
                      cell={row.hours}
                      formatValue={(c) => `${formatCount(c.current)}h / ${formatCount(c.target)}h`}
                    />
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {travelOverlayPending ? (
                    <MetricCellSkeleton />
                  ) : (
                    <TravelMetricCell row={row} />
                  )}
                </TableCell>
                <TableCell>
                  <ProductivityCell row={row} />
                </TableCell>
                <TableCell>
                  <div className="min-w-[5rem] space-y-1.5">
                    <ReportProgressBar value={row.achievement} />
                    <p className={cn('text-sm font-semibold tabular-nums', achievementColors.text)}>
                      {row.achievement}%
                    </p>
                  </div>
                </TableCell>
              </TableRow>
              {isExpanded ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={COL_COUNT} className="bg-muted/20 p-3">
                    <TeamTargetsPanel members={team} />
                  </TableCell>
                </TableRow>
              ) : null}
              </Fragment>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
