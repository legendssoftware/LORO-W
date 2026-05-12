'use client';

import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  useLeadsInfinite,
  useUnassignedLeadsInfinite,
  LEADS_LIST_PAGE_SIZE,
  useUsers,
  useDedupeLeadsMutation,
} from '@/api/hooks';
import { useLeadsStore } from '@/store/leads-store';
import type { LeadListItem } from '@/api/types/leads';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import {
  LeadsTable,
  type LeadActivityActorLookup,
  type LeadActivityActorProfile,
} from '@/components/leads-table/leads-table';
import { ImportLeadsModal } from './components/import-leads-modal';
import { LeadDetailDialog } from './components/lead-detail-dialog';
import { LeadsFiltersBar } from './components/leads-filters-bar';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { useSessionStore } from '@/store/session-store';
import { canViewAllOrgLeads, canDedupeOrgLeads } from '@/lib/leads-scope';
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
    dateBasis,
    selectedStatus,
    selectedSource,
    selectedUserId,
    dateRangePopoverOpen,
    setDateRangePopoverOpen,
    setStartDate,
    setEndDate,
    setUseAllTime,
    setDateBasis,
    selectEndDateAndClose,
    resetDateRangeToDefault,
    setSelectedStatus,
    setSelectedSource,
    setSelectedUserId,
    setSearchQuery,
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

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [dedupeDialogOpen, setDedupeDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadListItem | null>(null);

  const { data: users = [] } = useUsers({ limit: 100 });

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

  const leadsParams = {
    limit: LEADS_LIST_PAGE_SIZE,
    scope: listScope,
    ...(useAllTime
      ? {}
      : {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          ...(dateBasis === 'activity' ? { dateBasis: 'activity' as const } : {}),
        }),
    ...(selectedStatus && selectedStatus !== 'all' ? { status: selectedStatus } : {}),
    ...(selectedSource && selectedSource !== 'all' ? { source: selectedSource } : {}),
    ...(listScope === 'all' &&
    selectedUserId &&
    selectedUserId !== 'all' &&
    !Number.isNaN(Number(selectedUserId))
      ? { ownerId: Number(selectedUserId) }
      : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  const showUnassignedGroup =
    !selectedUserId || selectedUserId === 'all' || selectedUserId === '';

  const unassignedParams = {
    limit: LEADS_LIST_PAGE_SIZE,
    scope: listScope,
    ...(useAllTime
      ? {}
      : {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          ...(dateBasis === 'activity' ? { dateBasis: 'activity' as const } : {}),
        }),
    ...(selectedStatus && selectedStatus !== 'all' ? { status: selectedStatus } : {}),
    ...(selectedSource && selectedSource !== 'all' ? { source: selectedSource } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  const leadsQuery = useLeadsInfinite(leadsParams, { skipErrorToast: true });
  const unassignedQuery = useUnassignedLeadsInfinite(unassignedParams, {
    enabled: showUnassignedGroup,
    skipErrorToast: true,
  });

  const leads = useMemo(
    () => leadsQuery.data?.pages.flatMap((p) => p.data ?? []) ?? [],
    [leadsQuery.data]
  );
  const assignedOnlyLeads = useMemo(
    () => leads.filter((l) => l.owner != null),
    [leads]
  );
  const unassignedLeads = showUnassignedGroup
    ? (unassignedQuery.data?.pages.flatMap((p) => p.data ?? []) ?? [])
    : undefined;
  const unassignedTotal = showUnassignedGroup
    ? (unassignedQuery.data?.pages[0]?.meta?.total ?? 0)
    : undefined;

  const listLoading =
    leadsQuery.isLoading || (showUnassignedGroup && unassignedQuery.isLoading);

  const refetchLeads = () => {
    void leadsQuery.refetch();
    if (showUnassignedGroup) {
      void unassignedQuery.refetch();
    }
  };

  const listError =
    leadsQuery.isError
      ? leadsQuery.error
      : showUnassignedGroup && unassignedQuery.isError
        ? unassignedQuery.error
        : null;

  return (
    <section>
      <h2 className="mb-4 text-base font-medium text-foreground sm:text-lg">Lead history</h2>
      {listError != null ? (
        <QueryErrorBanner
          className="mb-4"
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
        startDate={startDate}
        endDate={endDate}
        useAllTime={useAllTime}
        dateBasis={dateBasis}
        selectedStatus={selectedStatus}
        selectedSource={selectedSource}
        selectedUserId={selectedUserId}
        dateRangePopoverOpen={dateRangePopoverOpen}
        onDateRangePopoverOpenChange={setDateRangePopoverOpen}
        onStartDateChange={setStartDate}
        onEndDateSelectAndClose={selectEndDateAndClose}
        onSetUseAllTime={setUseAllTime}
        onDateBasisChange={setDateBasis}
        onResetDateRange={resetDateRangeToDefault}
        onSetTodayActivity={() => {
          const now = new Date();
          setStartDate(now);
          setEndDate(now);
          setUseAllTime(false);
          setDateBasis('activity');
        }}
        onSelectedStatusChange={setSelectedStatus}
        onSelectedSourceChange={setSelectedSource}
        onSelectedUserIdChange={setSelectedUserId}
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
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDedupeDialogOpen(false)}
                disabled={dedupeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
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
      <div data-tour="leads-table">
        <LeadsTable
          leads={assignedOnlyLeads}
          unassignedLeads={unassignedLeads}
          unassignedTotal={unassignedTotal}
          isLoading={listLoading}
          emptyMessage="No leads match your filters."
          activityActorLookup={activityActorLookup}
          onLeadClick={(lead) => {
            setSelectedLead(lead);
            setLeadDialogOpen(true);
          }}
        />
      </div>
      {(leadsQuery.hasNextPage || (showUnassignedGroup && unassignedQuery.hasNextPage)) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {leadsQuery.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 border-gray-200 bg-white"
              onClick={() => leadsQuery.fetchNextPage()}
              disabled={leadsQuery.isFetchingNextPage}
            >
              {leadsQuery.isFetchingNextPage ? 'Loading…' : 'Load more leads'}
            </Button>
          ) : null}
          {showUnassignedGroup && unassignedQuery.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 border-gray-200 bg-white"
              onClick={() => unassignedQuery.fetchNextPage()}
              disabled={unassignedQuery.isFetchingNextPage}
            >
              {unassignedQuery.isFetchingNextPage ? 'Loading…' : 'Load more unassigned'}
            </Button>
          ) : null}
        </div>
      )}
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
    </section>
  );
}
