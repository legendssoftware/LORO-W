'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2Icon, Phone, Timer } from 'lucide-react';
import { useBranches, useCalls, useUsers } from '@/api/hooks';
import type { CallRecordingListItem } from '@/api/types/calls';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  utcMonthStartThroughToday,
  utcRangeIsoFromUtcCalendarStoredRange,
  formatUtcYmd,
} from '@/lib/utils/overview-daily-summary';
import {
  buildCallPartyMatchIndex,
  matchAgentParty,
  matchClientParty,
} from '@/lib/utils/call-party-match';
import { CallDetailDialog } from './components/call-detail-dialog';
import { CallPartyLabel } from './components/call-party-label';
import {
  CallsFiltersBar,
  type CallsDirectionFilter,
  type CallsStatusFilter,
} from './components/calls-filters-bar';
import {
  CALLS_PAGE_SIZE_STORAGE_KEY,
  CallsListPagination,
  readStoredCallsPageSize,
  type CallsPageSize,
} from './components/calls-list-pagination';
import { ORIGIN_LABEL, normalizeOrigin, originVariant } from './origin-badge';
import {
  SEARCH_DEBOUNCE_MS,
  STATUS_LABEL,
  callDirectionIcon,
  callDirectionLabel,
  formatCallDuration,
  formatCallScore,
  isRetryableTranscriptStatus,
  normalizeCallDirection,
  transcriptActionIcon,
  transcriptStatusIcon,
} from './call-display';
import { getScoreColorClasses } from './lib/score-colors';
import { cn } from '@/lib/utils';

/** Month-to-date UTC range, matching Visits/Leads default. */
function defaultCallsDateRange() {
  return utcMonthStartThroughToday();
}

export function CallsContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<CallsPageSize>(() => readStoredCallsPageSize());
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CallsStatusFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<CallsDirectionFilter>('all');
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [startDate, setStartDate] = useState(() => defaultCallsDateRange().start);
  const [endDate, setEndDate] = useState(() => defaultCallsDateRange().end);
  const [useAllTime, setUseAllTime] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, directionFilter, selectedBranchId, pageSize, startDate, endDate, useAllTime]);

  const dateParams = useMemo(() => {
    if (useAllTime) return { startDate: undefined, endDate: undefined };
    return utcRangeIsoFromUtcCalendarStoredRange(startDate, endDate);
  }, [useAllTime, startDate, endDate]);

  const parsedBranchId = Number.parseInt(selectedBranchId, 10);
  const branchId =
    selectedBranchId === 'all' || !Number.isInteger(parsedBranchId) || parsedBranchId <= 0
      ? undefined
      : parsedBranchId;

  const { data, isLoading, isError, isFetching, error, refetch } = useCalls({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    callType: directionFilter === 'all' ? undefined : directionFilter,
    startDate: dateParams.startDate,
    endDate: dateParams.endDate,
    branchId,
  });
  const branchesQuery = useBranches();
  const usersQuery = useUsers({ limit: 100 });

  const rows = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 0;
  const selectedRow = useMemo(
    () => rows.find((row) => row.uid === selectedUid) ?? null,
    [rows, selectedUid],
  );
  const matchIndex = useMemo(
    () => buildCallPartyMatchIndex(branchesQuery.data ?? [], usersQuery.data ?? []),
    [branchesQuery.data, usersQuery.data],
  );

  const mtd = utcMonthStartThroughToday();
  const isDefaultDateRange =
    !useAllTime &&
    formatUtcYmd(startDate) === formatUtcYmd(mtd.start) &&
    formatUtcYmd(endDate) === formatUtcYmd(mtd.end);
  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    statusFilter !== 'all' ||
    directionFilter !== 'all' ||
    selectedBranchId !== 'all' ||
    !isDefaultDateRange;

  function handlePageSizeChange(size: CallsPageSize) {
    setPageSize(size);
    try {
      localStorage.setItem(CALLS_PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      /* ignore */
    }
  }

  function handleResetDateRange() {
    const range = defaultCallsDateRange();
    setStartDate(range.start);
    setEndDate(range.end);
    setUseAllTime(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col overflow-hidden px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 flex shrink-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Call recordings</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Company-line PBX audio, transcribed into a speaker-labelled dialogue. In-app calls were
            started from LORO; company phone calls were dialled from Linkus or a desk handset.
          </p>
        </div>

        {isError ? (
          <QueryErrorBanner
            className="mb-4 shrink-0"
            message={getQueryErrorMessage(error, 'Could not load call recordings. Try again.')}
            onRetry={() => void refetch()}
          />
        ) : null}

        <CallsFiltersBar
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          directionFilter={directionFilter}
          onDirectionFilterChange={setDirectionFilter}
          selectedBranchId={selectedBranchId}
          onBranchIdChange={setSelectedBranchId}
          branches={branchesQuery.data ?? []}
          startDate={startDate}
          endDate={endDate}
          useAllTime={useAllTime}
          onRangeChange={(range) => {
            setStartDate(range.start);
            setEndDate(range.end);
          }}
          onUseAllTimeChange={setUseAllTime}
          onResetDateRange={handleResetDateRange}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden />
                Loading recordings…
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Phone className="size-8 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? 'No call recordings match your filters.'
                    : 'No call recordings yet.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Numbers</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Transcript</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <CallTableRow
                      key={row.uid}
                      row={row}
                      matchIndex={matchIndex}
                      onSelect={() => setSelectedUid(row.uid)}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <CallsListPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            isFetching={isFetching && !isLoading}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </main>

      <CallDetailDialog
        uid={selectedUid}
        open={Boolean(selectedUid)}
        onOpenChange={(open) => {
          if (!open) setSelectedUid(null);
        }}
        fallback={selectedRow}
        matchIndex={matchIndex}
      />
    </div>
  );
}

function CallTableRow({
  row,
  matchIndex,
  onSelect,
}: {
  row: CallRecordingListItem;
  matchIndex: ReturnType<typeof buildCallPartyMatchIndex>;
  onSelect: () => void;
}) {
  const origin = normalizeOrigin(row.origin);
  const direction = normalizeCallDirection(row.callType);
  const DirectionIcon = callDirectionIcon(direction);
  const agent = matchAgentParty(row, matchIndex);
  const client = matchClientParty(row, matchIndex);
  const StatusIcon = isRetryableTranscriptStatus(row.transcriptStatus)
    ? transcriptActionIcon(row.transcriptStatus)
    : transcriptStatusIcon(row.transcriptStatus);

  return (
    <TableRow className="cursor-pointer" onClick={onSelect}>
      <TableCell className="whitespace-nowrap">
        {row.startedAt ? format(new Date(row.startedAt), 'dd MMM yyyy HH:mm') : '—'}
      </TableCell>
      <TableCell>
        <Badge variant={originVariant(origin)}>{ORIGIN_LABEL[origin]}</Badge>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5">
          <DirectionIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {callDirectionLabel(direction, row.callType)}
        </span>
      </TableCell>
      <TableCell>
        <CallPartyLabel party={agent} />
      </TableCell>
      <TableCell>
        <CallPartyLabel party={client} />
      </TableCell>
      <TableCell className="font-mono text-xs">
        {row.fromNumber || '—'} → {row.toNumber || '—'}
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Timer className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {formatCallDuration(row.durationSeconds)}
        </span>
      </TableCell>
      <TableCell className={cn('tabular-nums font-medium', getScoreColorClasses(Number(row.scoreOverall ?? 0)).text)}>
        {formatCallScore(row.scoreOverall)}
      </TableCell>
      <TableCell>
        <Button
          type="button"
          size="sm"
          variant={isRetryableTranscriptStatus(row.transcriptStatus) ? 'outline' : 'ghost'}
          className="h-7 gap-1.5 px-2"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          {row.transcriptStatus === 'processing' ? (
            <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <StatusIcon className="size-3.5" aria-hidden />
          )}
          {STATUS_LABEL[row.transcriptStatus]}
        </Button>
      </TableCell>
    </TableRow>
  );
}
