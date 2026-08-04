'use client';

import { format } from 'date-fns';
import type { LeadListItem } from '@/api/types/leads';
import { filterActivityEntriesInRange } from '@/app/reports/lib/reports-target-detail-aggregates';
import {
  ReportsListPagination,
  type ReportsPageSize,
} from '@/app/reports/components/reports-list-pagination';
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
import {
  formatListLastActivitySummaryLine,
  leadActivityActionPresentation,
} from '@/lib/lead-activity-display';
import { humanizeReportLabel } from '@/lib/utils/report-labels';
import { cn } from '@/lib/utils';

function formatLeadWhen(raw: string | undefined): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'MMM d, yyyy · h:mm a');
}

function formatLeadValue(value: number | undefined, currency = 'R'): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function leadDisplayName(lead: LeadListItem): string {
  return lead.name?.trim() || lead.companyName?.trim() || `Lead #${lead.uid}`;
}

function leadStage(lead: LeadListItem): string {
  const stage = lead.lifecycleStage?.trim() || lead.status?.trim();
  return stage ? humanizeReportLabel(stage) : '—';
}

export interface ReportsTargetLeadsChangedTableProps {
  leads: LeadListItem[];
  total: number;
  page: number;
  pageSize: ReportsPageSize;
  totalPages: number;
  isLoading: boolean;
  isFetching?: boolean;
  fromYmd: string;
  toYmd: string;
  currency?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: ReportsPageSize) => void;
}

export function ReportsTargetLeadsChangedTable({
  leads,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  isFetching = false,
  fromYmd,
  toYmd,
  currency = 'R',
  onPageChange,
  onPageSizeChange,
}: ReportsTargetLeadsChangedTableProps) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">No leads changed in this range.</p>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">Leads changed</h4>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="min-w-[12rem]">Summary</TableHead>
              <TableHead>When</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const actionKey = lead.lastActivityAction ?? '';
              const actionBadge =
                actionKey !== ''
                  ? leadActivityActionPresentation(actionKey)
                  : null;
              const summaryRaw =
                lead.lastActivitySummary?.trim() ||
                (lead.createdAt ? 'Lead created' : undefined);
              const summary = formatListLastActivitySummaryLine(lead, summaryRaw);
              const inRangeCount = filterActivityEntriesInRange(lead, fromYmd, toYmd).length;

              return (
                <TableRow key={lead.uid}>
                  <TableCell className="max-w-[10rem]">
                    <div className="flex flex-col gap-0.5">
                      <span className="truncate font-medium">{leadDisplayName(lead)}</span>
                      {lead.companyName && lead.name ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {lead.companyName}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{leadStage(lead)}</TableCell>
                  <TableCell>
                    {actionBadge ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          'border px-1.5 py-0 text-[10px] font-medium',
                          actionBadge.className
                        )}
                      >
                        {actionBadge.label}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="line-clamp-2 text-sm text-muted-foreground">
                        {summary ?? '—'}
                      </span>
                      {inRangeCount > 1 ? (
                        <span className="text-[10px] text-muted-foreground/80">
                          {inRangeCount} changes in range
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatLeadWhen(lead.lastActivityAt ?? lead.createdAt)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatLeadValue(lead.estimatedValue, currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <ReportsListPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          isFetching={isFetching}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          className="rounded-none border-0 border-t"
        />
      </div>
    </div>
  );
}
