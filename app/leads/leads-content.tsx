'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  useLeads,
  useUnassignedLeads,
  useUsers,
  useBranches,
  useDedupeLeadsMutation,
} from '@/api/hooks';
import type { BranchListItem } from '@/api/types/branch';
import { useLeadsStore } from '@/store/leads-store';
import type { LeadListItem } from '@/api/types/leads';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  LeadsTable,
  type LeadActivityActorLookup,
  type LeadActivityActorProfile,
} from '@/components/leads-table/leads-table';
import { LeadsInboxView } from './components/leads-inbox-view';
import {
  LeadsListPagination,
  readStoredLeadsPageSize,
  LEADS_PAGE_SIZE_STORAGE_KEY,
  type LeadsPageSize,
} from './components/leads-list-pagination';
import { CreateLeadModal } from './components/create-lead-modal';
import { ImportLeadsModal } from './components/import-leads-modal';
import { LeadDetailDialog } from './components/lead-detail-dialog';
import { LeadsFiltersBar } from './components/leads-filters-bar';
import { formatUtcYmd } from '@/lib/utils/overview-daily-summary';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { useSessionStore } from '@/store/session-store';
import { canViewAllOrgLeads, canDedupeOrgLeads, leadEntryTypeToApiParam } from '@/lib/leads-scope';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SEARCH_DEBOUNCE_MS = 350;

export function LeadsContent() {
  const {
    startDate,
    endDate,
    useAllTime,
    selectedStatus,
    selectedSource,
    selectedEntryType,
    selectedTemperature,
    selectedPriority,
    selectedUserId,
    unassignedOnly,
    dateRangePopoverOpen,
    setDateRangePopoverOpen,
    setStartDate,
    setEndDate,
    setUseAllTime,
    resetDateRangeToDefault,
    setSelectedStatus,
    setSelectedSource,
    setSelectedEntryType,
    setSelectedTemperature,
    setSelectedPriority,
    setSelectedUserId,
    setSearchQuery,
    setUnassignedOnly,
  } = useLeadsStore();

  const [searchInput, setSearchInput] = useState(
    () => useLeadsStore.getState().searchQuery
  );
  const [debouncedSearch, setDebouncedSearch] = useState(() =>
    useLeadsStore.getState().searchQuery.trim()
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = searchInput.trim();
      setDebouncedSearch(next);
      setSearchQuery(next);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput, setSearchQuery]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<LeadsPageSize>(() => readStoredLeadsPageSize());

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [dedupeDialogOpen, setDedupeDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadListItem | null>(null);

  const { data: users = [] } = useUsers({ limit: 100 });
  const { data: branches = [] } = useBranches();

  const onLeadsRangeChange = useCallback(
    (range: { start: Date; end: Date }) => {
      setStartDate(range.start);
      setEndDate(range.end);
      setUseAllTime(false);
    },
    [setStartDate, setEndDate, setUseAllTime]
  );

  const activityActorLookup = useMemo<LeadActivityActorLookup>(() => {
    const byUid = new Map<number, LeadActivityActorProfile>();
    const byClerkId = new Map<string, LeadActivityActorProfile>();
    for (const u of users) {
      const row: LeadActivityActorProfile = {
        name: u.name,
        surname: u.surname,
        photoURL: u.photoURL ?? null,
        avatar: u.avatar ?? null,
      };
      byUid.set(u.uid, row);
      const cid = typeof u.clerkUserId === 'string' ? u.clerkUserId.trim() : '';
      if (cid) byClerkId.set(cid, row);
    }
    return { byUid, byClerkId };
  }, [users]);

  const profile = useSessionStore((s) => s.profileData);
  const canViewAll = useMemo(
    () => canViewAllOrgLeads(profile?.accessLevel ?? profile?.role),
    [profile?.accessLevel, profile?.role]
  );
  const canDedupe = useMemo(
    () => canDedupeOrgLeads(profile?.accessLevel, profile?.role),
    [profile?.accessLevel, profile?.role]
  );

  const dedupeMutation = useDedupeLeadsMutation();
  /** Org-wide list for admin/owner; personal list otherwise (no UI toggle). */
  const listScope: 'me' | 'all' = canViewAll ? 'all' : 'me';

  const sharedListFilters = {
    ...(useAllTime
      ? {}
      : {
          startDate: formatUtcYmd(startDate),
          endDate: formatUtcYmd(endDate),
        }),
    ...(selectedStatus && selectedStatus !== 'all' ? { status: selectedStatus } : {}),
    ...(selectedSource && selectedSource !== 'all' ? { source: selectedSource } : {}),
    ...(leadEntryTypeToApiParam(selectedEntryType)
      ? { entryType: leadEntryTypeToApiParam(selectedEntryType) }
      : {}),
    ...(selectedTemperature && selectedTemperature !== 'all'
      ? { temperature: selectedTemperature }
      : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  const leadsParams = {
    page,
    limit: pageSize,
    scope: listScope,
    ...sharedListFilters,
    ...(selectedPriority && selectedPriority !== 'all'
      ? { priority: selectedPriority }
      : {}),
    ...(listScope === 'all' &&
    !unassignedOnly &&
    selectedUserId &&
    selectedUserId !== 'all' &&
    !Number.isNaN(Number(selectedUserId))
      ? { ownerId: Number(selectedUserId) }
      : {}),
  };

  const unassignedParams = {
    page,
    limit: pageSize,
    scope: listScope,
    ...sharedListFilters,
  };

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    useAllTime,
    startDate,
    endDate,
    selectedStatus,
    selectedSource,
    selectedEntryType,
    selectedTemperature,
    selectedPriority,
    selectedUserId,
    listScope,
    pageSize,
    unassignedOnly,
  ]);

  const leadsQuery = useLeads(leadsParams, {
    skipErrorToast: true,
    enabled: !unassignedOnly,
  });
  const unassignedQuery = useUnassignedLeads(unassignedParams, {
    skipErrorToast: true,
    enabled: unassignedOnly,
  });

  const activeQuery = unassignedOnly ? unassignedQuery : leadsQuery;

  const leads = activeQuery.data?.data ?? [];
  const listMeta = activeQuery.data?.meta;
  const total = listMeta?.total ?? 0;
  const totalPages = listMeta?.totalPages ?? 0;

  const listLoading = activeQuery.isLoading;

  const refetchLeads = () => {
    void activeQuery.refetch();
  };

  const listError = activeQuery.isError ? activeQuery.error : null;

  function handleSelectedUserIdChange(userId: string) {
    if (userId !== '' && userId !== 'all') {
      setUnassignedOnly(false);
    }
    setSelectedUserId(userId);
  }

  function handleUnassignedOnlyChange(value: boolean) {
    if (value) {
      setSelectedUserId('');
    }
    setUnassignedOnly(value);
  }

  function handlePageSizeChange(size: LeadsPageSize) {
    setPageSize(size);
    try {
      localStorage.setItem(LEADS_PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col overflow-hidden px-3 py-5 sm:px-6 sm:py-8">
        <div
          className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          data-tour="leads-page-header"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Leads</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              View, track, and manage your sales leads.
            </p>
          </div>
          <Button
            className={cn(
              'h-9 shrink-0 gap-2 self-start border-0 !rounded px-4',
              'bg-violet-600 text-white hover:bg-violet-700',
              'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
              '[&_svg]:text-white focus-visible:ring-violet-500/40'
            )}
            data-tour="leads-create-button"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="size-4" />
            Create lead
          </Button>
        </div>

        {listError != null ? (
          <QueryErrorBanner
            className="mb-4 shrink-0"
            message={getQueryErrorMessage(
              listError,
              'Could not load leads. Try again.'
            )}
            onRetry={refetchLeads}
          />
        ) : null}
        <LeadsFiltersBar
          listScope={listScope}
          users={users}
          branches={branches as BranchListItem[]}
          startDate={startDate}
          endDate={endDate}
          useAllTime={useAllTime}
          selectedStatus={selectedStatus}
          selectedSource={selectedSource}
          selectedEntryType={selectedEntryType}
          selectedTemperature={selectedTemperature}
          selectedPriority={selectedPriority}
          selectedUserId={selectedUserId}
          dateRangePopoverOpen={dateRangePopoverOpen}
          onDateRangePopoverOpenChange={setDateRangePopoverOpen}
          onRangeChange={onLeadsRangeChange}
          onSetUseAllTime={setUseAllTime}
          onResetDateRange={resetDateRangeToDefault}
          onSelectedStatusChange={setSelectedStatus}
          onSelectedSourceChange={setSelectedSource}
          onSelectedEntryTypeChange={setSelectedEntryType}
          onSelectedTemperatureChange={setSelectedTemperature}
          onSelectedPriorityChange={setSelectedPriority}
          onSelectedUserIdChange={handleSelectedUserIdChange}
          unassignedOnly={unassignedOnly}
          onUnassignedOnlyChange={handleUnassignedOnlyChange}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          canDedupe={canDedupe}
          dedupePending={dedupeMutation.isPending}
          onImportClick={() => setImportModalOpen(true)}
          onDedupeClick={() => setDedupeDialogOpen(true)}
        />
        {canDedupe ? (
          <Dialog open={dedupeDialogOpen} onOpenChange={setDedupeDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Deduplicate leads?</DialogTitle>
                <DialogDescription>
                  This permanently deletes duplicate leads in your organisation. For each group with the same email
                  or the same name and phone number, we keep the oldest lead and move interactions onto it. This
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-3">
                <Button
                  type="button"
                  variant="cancel"
                  onClick={() => setDedupeDialogOpen(false)}
                  disabled={dedupeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-purple-600 text-white hover:bg-purple-700 hover:text-white focus-visible:ring-purple-600/50"
                  onClick={() =>
                    dedupeMutation.mutate(undefined, {
                      onSuccess: (data) => {
                        toast.success(data.message);
                        setDedupeDialogOpen(false);
                      },
                      onError: (err: unknown) => {
                        const msg =
                          err &&
                          typeof err === 'object' &&
                          'response' in err &&
                          err.response &&
                          typeof err.response === 'object' &&
                          'data' in err.response &&
                          err.response.data &&
                          typeof err.response.data === 'object' &&
                          'message' in err.response.data &&
                          typeof (err.response.data as { message: unknown }).message === 'string'
                            ? (err.response.data as { message: string }).message
                            : err instanceof Error
                              ? err.message
                              : 'Dedupe failed';
                        toast.error(msg);
                      },
                    })
                  }
                  disabled={dedupeMutation.isPending}
                >
                  {dedupeMutation.isPending ? 'Running…' : 'Run dedupe'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
        <div
          data-tour="leads-table"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="hidden lg:block">
              <LeadsInboxView
                leads={leads}
                isLoading={listLoading}
                emptyMessage="No leads match your filters."
                selectedLeadUid={selectedLead?.uid ?? null}
                activityActorLookup={activityActorLookup}
                onLeadClick={(lead) => {
                  setSelectedLead(lead);
                  setLeadDialogOpen(true);
                }}
              />
            </div>
            <div className="lg:hidden">
              <LeadsTable
                leads={leads}
                isLoading={listLoading}
                emptyMessage="No leads match your filters."
                activityActorLookup={activityActorLookup}
                onLeadClick={(lead) => {
                  setSelectedLead(lead);
                  setLeadDialogOpen(true);
                }}
              />
            </div>
          </div>
          <LeadsListPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            isFetching={activeQuery.isFetching && !activeQuery.isLoading}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
        <LeadDetailDialog
          open={leadDialogOpen}
          onOpenChange={(open) => {
            setLeadDialogOpen(open);
            if (!open) setSelectedLead(null);
          }}
          lead={selectedLead}
          onActionSuccess={() => refetchLeads()}
        />
        <ImportLeadsModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          onSuccess={() => refetchLeads()}
        />
        <CreateLeadModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
        />
      </main>
    </div>
  );
}
