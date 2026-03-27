'use client';

import { useMemo, useState } from 'react';
import { format, isSameDay, startOfMonth } from 'date-fns';
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
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, XIcon } from '@/lib/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CopyMinus, Upload as UploadIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { LeadsTable } from '@/components/leads-table/leads-table';
import { ImportLeadsModal } from './components/import-leads-modal';
import { LeadDetailDialog } from './components/lead-detail-dialog';
import { cn } from '@/lib/utils';
import {
  LEAD_STATUS_OPTIONS_WITH_ALL,
  LEAD_SOURCE_OPTIONS_WITH_ALL,
} from '@/lib/lead-form-utils';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function LeadsContent() {
  const {
    startDate,
    endDate,
    useAllTime,
    dateBasis,
    selectedStatus,
    selectedSource,
    selectedUserId,
    searchQuery,
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

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [dedupeDialogOpen, setDedupeDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadListItem | null>(null);

  const { data: users = [] } = useUsers({ limit: 100 });

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
    ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
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
        }),
    ...(selectedStatus && selectedStatus !== 'all' ? { status: selectedStatus } : {}),
    ...(selectedSource && selectedSource !== 'all' ? { source: selectedSource } : {}),
    ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
  };

  const leadsQuery = useLeadsInfinite(leadsParams);
  const unassignedQuery = useUnassignedLeadsInfinite(unassignedParams, {
    enabled: showUnassignedGroup,
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
    leadsQuery.refetch();
    if (showUnassignedGroup) {
      unassignedQuery.refetch();
    }
  };

  return (
    <section>
      <h2 className="mb-4 text-lg font-medium text-foreground">Lead history</h2>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0">
            <Popover open={dateRangePopoverOpen} onOpenChange={setDateRangePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 min-w-[140px] justify-center gap-2 border-gray-200 bg-white text-foreground"
                >
                  <CalendarIcon className="size-4" />
                  {useAllTime
                    ? 'All time'
                    : startDate.getTime() === endDate.getTime()
                      ? format(startDate, 'MMM d, yyyy')
                      : `${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto min-w-[480px] p-0" align="start">
                <div className="flex flex-col gap-3 p-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={useAllTime ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUseAllTime(true)}
                    >
                      All time
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      or pick a date range below
                    </span>
                  </div>
                  <div className="flex flex-row gap-6">
                    <div>
                      <p className="text-sm font-medium">Start date</p>
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => {
                          if (d) {
                            setStartDate(d);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">End date</p>
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => {
                          if (d) selectEndDateAndClose(d);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {(() => {
              const now = new Date();
              const isDefaultRange =
                !useAllTime &&
                isSameDay(startDate, startOfMonth(now)) &&
                isSameDay(endDate, now);
              return useAllTime || !isDefaultRange ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    resetDateRangeToDefault();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      resetDateRangeToDefault();
                    }
                  }}
                  className="ml-0.5 shrink-0 cursor-pointer rounded p-0.5 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Reset to this month"
                >
                  <XIcon className="size-4 text-red-600" />
                </span>
              ) : null;
            })()}
          </div>
          <Select
            value={useAllTime ? 'created' : dateBasis}
            onValueChange={(v) =>
              setDateBasis(v as 'created' | 'activity')
            }
            disabled={useAllTime}
          >
            <SelectTrigger
              className="h-9 min-w-[200px] w-[240px] border-gray-200 bg-white text-foreground disabled:opacity-60"
              title={
                useAllTime
                  ? 'Choose a date range to filter by created date or last activity'
                  : 'Created: lead created in range. Last activity: updated in range (excludes never edited).'
              }
            >
              <SelectValue placeholder="Range applies to" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Created in range</SelectItem>
              <SelectItem value="activity">
                <span className="flex flex-col items-start gap-0.5 text-left">
                  <span>Last activity in range</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Excludes leads never edited after creation
                  </span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 border-gray-200 bg-white text-foreground"
            title="Sets range to today and filters by last activity (server: updated in range, edited after creation)."
            onClick={() => {
              const now = new Date();
              setStartDate(now);
              setEndDate(now);
              setUseAllTime(false);
              setDateBasis('activity');
            }}
          >
            Today&apos;s activity
          </Button>
          <Select
            value={selectedStatus || 'all'}
            onValueChange={(v) => setSelectedStatus(v)}
          >
            <SelectTrigger className="h-9 min-w-[100px] w-[128px] border-gray-200 bg-white text-foreground">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUS_OPTIONS_WITH_ALL.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <opt.icon className="size-4 shrink-0" />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedSource || 'all'}
            onValueChange={(v) => setSelectedSource(v)}
          >
            <SelectTrigger className="h-9 min-w-[100px] w-[128px] border-gray-200 bg-white text-foreground">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              {LEAD_SOURCE_OPTIONS_WITH_ALL.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <opt.icon className="size-4 shrink-0" />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {listScope === 'all' ? (
            <Select
              value={selectedUserId || 'all'}
              onValueChange={(v) => setSelectedUserId(v)}
            >
              <SelectTrigger className="h-9 min-w-[140px] w-[200px] border-gray-200 bg-white text-foreground">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((user) => {
                  const fullName = [user.name, user.surname].filter(Boolean).join(' ') || user.email || `User ${user.uid}`;
                  const imgSrc = (user as { photoURL?: string | null; avatar?: string | null }).photoURL ?? (user as { photoURL?: string | null; avatar?: string | null }).avatar ?? undefined;
                  return (
                    <SelectItem key={user.uid} value={String(user.uid)}>
                      <span className="flex items-center gap-2">
                        <Avatar className="size-6 shrink-0">
                          <AvatarImage src={imgSrc} alt={fullName} />
                          <AvatarFallback className="text-xs">
                            {fullName !== `User ${user.uid}` ? fullName.slice(0, 2).toUpperCase() : String(user.uid).slice(-2)}
                          </AvatarFallback>
                        </Avatar>
                        {fullName}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <div className="relative w-56 min-w-0 shrink sm:w-64">
            <Input
              placeholder="Search leads…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'h-9 w-full border-gray-200 bg-white text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0',
                searchQuery && 'pr-8'
              )}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Clear search"
              >
                <XIcon className="size-4 text-red-600" />
              </button>
            ) : null}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0 border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-50 hover:text-neutral-950"
                onClick={() => setImportModalOpen(true)}
                aria-label="Import leads"
              >
                <UploadIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import leads</TooltipContent>
          </Tooltip>
          {canDedupe ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDedupeDialogOpen(true)}
                    disabled={dedupeMutation.isPending}
                    aria-label="Dedupe leads"
                  >
                    <CopyMinus className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Remove duplicate leads for this organisation (keeps the oldest in each group)
                </TooltipContent>
              </Tooltip>
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
            </>
          ) : null}
        </div>
      </div>
      <LeadsTable
        leads={assignedOnlyLeads}
        unassignedLeads={unassignedLeads}
        unassignedTotal={unassignedTotal}
        isLoading={listLoading}
        emptyMessage="No leads match your filters."
        onLeadClick={(lead) => {
          setSelectedLead(lead);
          setLeadDialogOpen(true);
        }}
      />
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
