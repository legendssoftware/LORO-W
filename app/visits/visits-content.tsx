'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useOrgName } from '@/lib/org-id-context';
import { utcRangeIsoFromUtcCalendarStoredRange } from '@/lib/utils/overview-daily-summary';
import {
  useCheckIns,
  useCheckInStatus,
  useCheckInMutation,
  useSearchableUsersList,
  useBranches,
  useTokenReady,
  useSessionSync,
} from '@/api/hooks';
import type { MethodOfContact } from '@/api/types/visits';
import { mapCheckInsFromApi } from '@/lib/utils/visits-export';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DetailDialogCloseButton,
  DETAIL_DIALOG_SMALL_CONTENT_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { MapPin, Phone, MessageCircle, Mail, MoreHorizontal } from 'lucide-react';
import { Loader2Icon } from '@/lib/icons';
import { VisitsTable } from '@/components/visits-table/visits-table';
import { VisitHistoryToolbar } from '@/components/visits-table/visit-history-toolbar';
import {
  filterVisitCheckIns,
  getSortedUniqueBusinessTypes,
  getSortedUniqueRegions,
} from '@/lib/utils/visit-history-filters';
import { METHOD_OPTIONS, TYPE_OF_BUSINESS_OPTIONS } from '@/lib/visit-form-utils';
import { useVisitsStore } from '@/store/visits-store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { VisitsSummaryModalPayload } from '@/app/visits/visits-summary-modal';
import {
  VisitsListPagination,
  readStoredVisitsPageSize,
  VISITS_PAGE_SIZE_STORAGE_KEY,
  type VisitsPageSize,
} from './components/visits-list-pagination';
import { buildCheckInPayload } from '@/lib/check-in-utils';
import { EndVisitDialog } from '@/components/visits/end-visit-dialog';

function getVisitMethodIcon(method: string | null | undefined) {
  if (!method) return MapPin;
  const m = method.toLowerCase();
  if (m === 'telephone') return Phone;
  if (m === 'whatsapp') return MessageCircle;
  if (m === 'email') return Mail;
  return MapPin;
}

export function VisitsContent({
  onRequestVisitsSummary,
}: {
  onRequestVisitsSummary: (payload: VisitsSummaryModalPayload) => void;
}) {
  const { isLoaded: authLoaded } = useAuth();
  const { isTokenReady } = useTokenReady();
  useSessionSync();

  const {
    startDate,
    endDate,
    useAllTime,
    selectedRegion,
    selectedBusinessType,
    selectedUserUid,
    searchQuery,
    methodModalOpen,
    setMethodModalOpen,
    endVisitOpen,
    setEndVisitOpen,
    selectedMethod,
    setSelectedMethod,
    setSelectedUserUid,
  } = useVisitsStore();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<VisitsPageSize>(() => readStoredVisitsPageSize());
  const orgName = useOrgName();
  const mounted = authLoaded && isTokenReady;

  const {
    users: pickerUsers,
    baseUsers: usersList,
    searchQuery: userSearchQuery,
    setSearchQuery: setUserSearchQuery,
    isSearchLoading: isUserSearchLoading,
    bindUidChange,
  } = useSearchableUsersList({ limit: 200, enabled: mounted });
  const handleSelectedUserUidChange = bindUidChange((uid: string) => {
    setSelectedUserUid(uid === 'all' ? '' : uid);
  });
  const branchesQuery = useBranches({ enabled: mounted });

  const checkInsDateRange = useMemo(
    () =>
      useAllTime ? null : utcRangeIsoFromUtcCalendarStoredRange(startDate, endDate),
    [useAllTime, startDate, endDate]
  );

  const statusQuery = useCheckInStatus({ enabled: mounted });
  const checkInsQuery = useCheckIns(
    {
      ...(checkInsDateRange ?? {}),
      ...(selectedUserUid ? { userUid: selectedUserUid } : {}),
    },
    { enabled: mounted }
  );
  const checkInMutation = useCheckInMutation();

  const checkedIn = statusQuery.data?.checkedIn === true;
  const checkIns = useMemo(
    () =>
      mapCheckInsFromApi(
        checkInsQuery.data?.checkIns ?? [],
        usersList,
        branchesQuery.data ?? []
      ),
    [checkInsQuery.data, usersList, branchesQuery.data]
  );

  const uniqueRegions = useMemo(() => getSortedUniqueRegions(checkIns), [checkIns]);

  const businessTypeLabelMap = useMemo(
    () => new Map(TYPE_OF_BUSINESS_OPTIONS.map((o) => [o.value, o.label])),
    []
  );
  const businessTypeIconMap = useMemo(() => {
    const m = new Map(TYPE_OF_BUSINESS_OPTIONS.map((o) => [o.value, o.icon]));
    m.set('Not set', MoreHorizontal);
    return m;
  }, []);

  const uniqueBusinessTypes = useMemo(() => getSortedUniqueBusinessTypes(checkIns), [checkIns]);

  const filteredCheckIns = useMemo(
    () =>
      filterVisitCheckIns(checkIns, {
        selectedRegion,
        selectedBusinessType,
        searchQuery,
      }),
    [checkIns, searchQuery, selectedRegion, selectedBusinessType]
  );

  const total = filteredCheckIns.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const paginatedCheckIns = useMemo(
    () => filteredCheckIns.slice((page - 1) * pageSize, page * pageSize),
    [filteredCheckIns, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [
    startDate,
    endDate,
    useAllTime,
    selectedRegion,
    selectedBusinessType,
    selectedUserUid,
    searchQuery,
    pageSize,
  ]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function handlePageSizeChange(size: VisitsPageSize) {
    setPageSize(size);
    try {
      localStorage.setItem(VISITS_PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      /* ignore */
    }
  }

  const activeVisit = useMemo(
    () => checkIns.find((c) => !c.checkOutTime) ?? null,
    [checkIns]
  );

  const openMethodModal = () => setMethodModalOpen(true);
  const closeMethodModal = () => {
    setMethodModalOpen(false);
    setSelectedMethod(null);
  };

  const startVisit = async () => {
    if (!selectedMethod) {
      toast.error('Please select a method of visit');
      return;
    }
    const payload = await buildCheckInPayload(selectedMethod);
    try {
      await checkInMutation.mutateAsync(payload);
      toast.success('Visit started');
      closeMethodModal();
      statusQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start visit');
    }
  };

  const openEndVisit = () => setEndVisitOpen(true);

  const handleOpenVisitsSummary = () => {
    onRequestVisitsSummary({
      checkIns: filteredCheckIns,
      startDate,
      endDate,
      companyName: orgName ?? 'Organisation',
      useAllTime,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col overflow-hidden px-3 py-5 sm:px-6 sm:py-8">
        <div
          className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          data-tour="visits-page-header"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Calls</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Start or end a call or field visit and view your activity history.
            </p>
          </div>
          {checkedIn ? (
            <Button
              className={cn(
                'h-9 shrink-0 gap-2 self-start border-0 !rounded px-4',
                'bg-red-600 text-white hover:bg-red-700',
                '[&_svg]:text-white focus-visible:ring-red-500/40'
              )}
              data-tour="visits-visit-action"
              onClick={openEndVisit}
            >
              {(() => {
                const Icon = getVisitMethodIcon(activeVisit?.methodOfContact);
                return <Icon className="size-4" />;
              })()}
              End visit
            </Button>
          ) : (
            <Button
              className={cn(
                'h-9 shrink-0 gap-2 self-start border-0 !rounded px-4',
                'bg-violet-600 text-white hover:bg-violet-700',
                'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
                '[&_svg]:text-white focus-visible:ring-violet-500/40'
              )}
              data-tour="visits-visit-action"
              onClick={openMethodModal}
            >
              <MapPin className="size-4" />
              Start visit
            </Button>
          )}
        </div>

        <Dialog open={methodModalOpen} onOpenChange={(open) => !open && closeMethodModal()}>
          <DialogContent
            showCloseButton={false}
            className={DETAIL_DIALOG_SMALL_CONTENT_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10">
              <DetailDialogCloseButton />
            </div>
            <DialogHeader className="pr-24">
              <DialogTitle>Start visit</DialogTitle>
              <DialogDescription>Choose how you are conducting this visit.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <p className="text-sm font-medium">Method of visit</p>
              <div className="grid grid-cols-2 gap-2">
                {METHOD_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <Button
                      key={opt.value}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMethod(opt.value as MethodOfContact)}
                      className={
                        selectedMethod === opt.value
                          ? 'border-purple-600 bg-purple-600 text-white hover:bg-purple-700 hover:text-white gap-2 rounded-md'
                          : 'gap-2 rounded-md'
                      }
                    >
                      <Icon className="size-4 shrink-0" />
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
              <DialogFooter className="gap-3">
                <Button variant="cancel" className="rounded-full" onClick={closeMethodModal}>
                  Cancel
                </Button>
                <Button
                  variant="success"
                  className="rounded-full"
                  onClick={startVisit}
                  disabled={checkInMutation.isPending || !selectedMethod}
                >
                  {checkInMutation.isPending && <Loader2Icon className="size-4 animate-spin" />}
                  Start visit
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <EndVisitDialog
          open={endVisitOpen}
          onOpenChange={setEndVisitOpen}
          activeVisit={activeVisit}
          onSuccess={() => checkInsQuery.refetch()}
        />

        <VisitHistoryToolbar
          uniqueRegions={uniqueRegions}
          uniqueBusinessTypes={uniqueBusinessTypes}
          businessTypeLabelMap={businessTypeLabelMap}
          businessTypeIconMap={businessTypeIconMap}
          usersList={pickerUsers}
          branches={branchesQuery.data ?? []}
          visitsSummaryDisabled={checkInsQuery.isLoading || filteredCheckIns.length === 0}
          onOpenVisitsSummary={handleOpenVisitsSummary}
          sectionHeading={null}
          userSearchQuery={userSearchQuery}
          onUserSearchQueryChange={setUserSearchQuery}
          isUserSearchLoading={isUserSearchLoading}
          onUserUidChange={handleSelectedUserUidChange}
        />
        <div
          data-tour="visits-history-content"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <VisitsTable
              checkIns={paginatedCheckIns}
              isLoading={checkInsQuery.isLoading}
              emptyMessage={
                checkIns.length === 0
                  ? 'No visits yet. Start a visit to see it here.'
                  : 'No visits match your search.'
              }
              onVisitUpdated={() => checkInsQuery.refetch()}
            />
          </div>
          <VisitsListPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            isFetching={checkInsQuery.isFetching && !checkInsQuery.isLoading}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </main>
    </div>
  );
}
