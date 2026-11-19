'use client';

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
import { statusFilterIconClass } from '@/lib/status-filter-icon';
import { cn } from '@/lib/utils';

const MERCHANDISE_STATUS_LABEL_KEYS: Record<
  (typeof MERCHANDISE_STATUS_OPTIONS)[number]['value'],
  string
> = {
  all: 'actions.allStatuses',
  PENDING_REVIEW: 'chrome.merchandise.status.pendingReview',
  PUBLISHED: 'chrome.merchandise.status.published',
  REJECTED: 'chrome.merchandise.status.rejected',
  DRAFT: 'chrome.merchandise.status.draft',
  ARCHIVED: 'chrome.merchandise.status.archived',
};

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
  actions,
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
  actions?: ReactNode;
}) {
  const { t } = useTranslation('screens');
  return (
    <div className="mb-4 flex w-full min-w-0 items-center justify-between gap-3">
      <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
          <ListDateRangeFilter value={dateRange} onChange={onDateRangeChange} />
          <SearchableBranchPicker
            branches={branches}
            selectedBranchId={selectedBranchId}
            onBranchChange={onBranchChange}
            triggerClassName="h-9 w-44 shrink-0"
          />
          <SearchableUserPicker
            users={users}
            branches={branches}
            selectedUid={selectedUserUid}
            onUidChange={onUserUidChange}
            triggerClassName="h-9 w-48 shrink-0"
            searchQuery={userSearchQuery}
            onSearchQueryChange={onUserSearchQueryChange}
            isSearchLoading={isUserSearchLoading}
          />
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger
              className="h-9 w-[160px] shrink-0 border-border bg-background"
              aria-label={t('chrome.merchandise.filterByStatus')}
            >
              <SelectValue placeholder={t('tables.status')} />
            </SelectTrigger>
            <SelectContent>
              {MERCHANDISE_STATUS_OPTIONS.map((option) => {
                const Icon = merchandiseStatusIcon(option.value);
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <Icon className={cn('size-4', statusFilterIconClass(option.value))} />
                    {t(MERCHANDISE_STATUS_LABEL_KEYS[option.value])}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex shrink-0 flex-nowrap items-center gap-2">
        <Input
          value={searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('chrome.merchandise.searchPlaceholder')}
          className={cn(filterToolbarSearchInputClassName, 'w-56 max-w-[16rem]')}
          aria-label={t('chrome.merchandise.searchAria')}
        />
        {actions}
      </div>
    </div>
  );
}
