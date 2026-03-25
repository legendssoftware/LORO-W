'use client';

import { useMemo, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { useLeads, useUnassignedLeads, useUsers } from '@/api/hooks';
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
import { Upload as UploadIcon } from 'lucide-react';
import { LeadsTable } from '@/components/leads-table/leads-table';
import { ImportLeadsModal } from './components/import-leads-modal';
import { LeadDetailDialog } from './components/lead-detail-dialog';
import { cn } from '@/lib/utils';
import {
  LEAD_STATUS_OPTIONS_WITH_ALL,
  LEAD_SOURCE_OPTIONS_WITH_ALL,
} from '@/lib/lead-form-utils';

const today = new Date();

export function LeadsContent() {
  const {
    startDate,
    endDate,
    useAllTime,
    selectedStatus,
    selectedSource,
    selectedUserId,
    searchQuery,
    dateRangePopoverOpen,
    setDateRangePopoverOpen,
    setStartDate,
    setUseAllTime,
    selectEndDateAndClose,
    resetDateRangeToDefault,
    setSelectedStatus,
    setSelectedSource,
    setSelectedUserId,
    setSearchQuery,
  } = useLeadsStore();

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadListItem | null>(null);

  const { data: users = [] } = useUsers({ limit: 100 });

  const leadsParams = {
    page: 1,
    limit: 100,
    ...(useAllTime
      ? {}
      : {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        }),
    ...(selectedStatus && selectedStatus !== 'all' ? { status: selectedStatus } : {}),
    ...(selectedSource && selectedSource !== 'all' ? { source: selectedSource } : {}),
    ...(selectedUserId && selectedUserId !== 'all' && !Number.isNaN(Number(selectedUserId))
      ? { ownerId: Number(selectedUserId) }
      : {}),
    ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
  };

  const showUnassignedGroup =
    !selectedUserId || selectedUserId === 'all' || selectedUserId === '';

  const unassignedParams = {
    page: 1,
    limit: 100,
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

  const leadsQuery = useLeads(leadsParams);
  const unassignedQuery = useUnassignedLeads(unassignedParams, {
    enabled: showUnassignedGroup,
  });

  const leads = leadsQuery.data?.data ?? [];
  const assignedOnlyLeads = useMemo(
    () => leads.filter((l) => l.owner != null),
    [leads]
  );
  const unassignedLeads = showUnassignedGroup
    ? (unassignedQuery.data?.data ?? [])
    : undefined;
  const unassignedTotal = showUnassignedGroup
    ? (unassignedQuery.data?.meta?.total ?? 0)
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
              const isDefaultRange =
                !useAllTime && isSameDay(startDate, today) && isSameDay(endDate, today);
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
                  aria-label="Reset to today"
                >
                  <XIcon className="size-4 text-red-600" />
                </span>
              ) : null;
            })()}
          </div>
          <Select
            value={selectedStatus || 'all'}
            onValueChange={(v) => setSelectedStatus(v)}
          >
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] border-gray-200 bg-white text-foreground">
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
            <SelectTrigger className="h-9 min-w-[140px] w-[200px] border-gray-200 bg-white text-foreground">
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
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-gray-200 bg-white text-foreground"
            onClick={() => setImportModalOpen(true)}
          >
            <UploadIcon className="size-4" />
            Import
          </Button>
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
