'use client';

import type { LucideIcon } from 'lucide-react';
import { Archive, CheckCircle2, Clock, FilePen, ListFilter, XCircle } from 'lucide-react';
import type { UserListItem } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SearchableBranchPicker,
  SearchableUserPicker,
} from '@/components/filters/searchable-filter-comboboxes';
import {
  ListDateRangeFilter,
  type ListDateRangeValue,
} from '@/components/filters/list-date-range-filter';
import { MERCHANDISE_STATUS_OPTIONS } from '@/app/merchandise/lib/merchandise-display';
import { cn } from '@/lib/utils';

function merchandiseStatusIcon(status: string): LucideIcon {
  switch (status) {
    case 'all':
      return ListFilter;
    case 'PENDING_REVIEW':
      return Clock;
    case 'PUBLISHED':
      return CheckCircle2;
    case 'REJECTED':
      return XCircle;
    case 'DRAFT':
      return FilePen;
    case 'ARCHIVED':
      return Archive;
    default:
      return ListFilter;
  }
}

export function MerchandiseFiltersBar({
  status,
  onStatusChange,
  searchInput,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  branches,
  selectedBranchId,
  onBranchChange,
  users,
  selectedUserUid,
  onUserUidChange,
  userSearchQuery,
  onUserSearchQueryChange,
  isUserSearchLoading,
}: {
  status: string;
  onStatusChange: (status: string) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  dateRange: ListDateRangeValue;
  onDateRangeChange: (value: ListDateRangeValue) => void;
  branches: BranchListItem[];
  selectedBranchId: string;
  onBranchChange: (branchId: string) => void;
  users: UserListItem[];
  selectedUserUid: string;
  onUserUidChange: (uid: string) => void;
  userSearchQuery: string;
  onUserSearchQueryChange: (query: string) => void;
  isUserSearchLoading: boolean;
}) {
  return (
    <div className="mb-6 flex w-full min-w-0 flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
      <ListDateRangeFilter value={dateRange} onChange={onDateRangeChange} />
      <SearchableBranchPicker
        branches={branches}
        selectedBranchId={selectedBranchId}
        onBranchChange={onBranchChange}
        triggerClassName="h-9 md:w-44"
      />
      <SearchableUserPicker
        users={users}
        branches={branches}
        selectedUid={selectedUserUid}
        onUidChange={onUserUidChange}
        triggerClassName="h-9 md:w-48"
        searchQuery={userSearchQuery}
        onSearchQueryChange={onUserSearchQueryChange}
        isSearchLoading={isUserSearchLoading}
        allOptionLabel="All users"
      />
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger
          className="h-9 w-full border-border bg-background sm:w-auto"
          aria-label="Filter by status"
        >
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {MERCHANDISE_STATUS_OPTIONS.map((option) => {
            const Icon = merchandiseStatusIcon(option.value);
            return (
              <SelectItem key={option.value} value={option.value}>
                <Icon className="size-4 text-muted-foreground" />
                {option.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Input
        value={searchInput}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search client, comments, or owner"
        className={cn(
          filterToolbarSearchInputClassName,
          'w-full md:ml-auto md:w-56 md:max-w-[16rem]'
        )}
        aria-label="Search merchandise"
      />
    </div>
  );
}
