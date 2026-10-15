'use client';

import type { AssetCategory } from '@/api/types/asset';
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
import { Boxes, Building2, User } from 'lucide-react';
import { ASSET_CATEGORY_OPTIONS, assetCategoryIcon } from '../lib/asset-display';

type AssetScope = 'mine' | 'org';

export function AssetsFiltersBar({
  canManage,
  scope,
  onScopeChange,
  searchInput,
  onSearchChange,
  category,
  onCategoryChange,
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
  canManage: boolean;
  scope: AssetScope;
  onScopeChange: (scope: AssetScope) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  category: AssetCategory | 'all';
  onCategoryChange: (value: AssetCategory | 'all') => void;
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
    <div className="mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <ListDateRangeFilter value={dateRange} onChange={onDateRangeChange} />
      <SearchableBranchPicker
        branches={branches}
        selectedBranchId={selectedBranchId}
        onBranchChange={onBranchChange}
        triggerClassName="h-9 sm:w-44"
      />
      <SearchableUserPicker
        users={users}
        branches={branches}
        selectedUid={selectedUserUid}
        onUidChange={onUserUidChange}
        triggerClassName="h-9 sm:w-48"
        searchQuery={userSearchQuery}
        onSearchQueryChange={onUserSearchQueryChange}
        isSearchLoading={isUserSearchLoading}
        allOptionLabel="All users"
      />
      {canManage ? (
        <Select value={scope} onValueChange={(value) => onScopeChange(value as AssetScope)}>
          <SelectTrigger className="h-9 w-full border-border bg-background sm:w-48" aria-label="Asset scope">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mine">
              <User className="size-4 text-muted-foreground" />
              My assets
            </SelectItem>
            <SelectItem value="org">
              <Building2 className="size-4 text-muted-foreground" />
              Organisation
            </SelectItem>
          </SelectContent>
        </Select>
      ) : null}
      <Select
        value={category}
        onValueChange={(value) => onCategoryChange(value as AssetCategory | 'all')}
      >
        <SelectTrigger className="h-9 w-full border-border bg-background sm:w-48" aria-label="Asset category">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <Boxes className="size-4 text-muted-foreground" />
            All categories
          </SelectItem>
          {ASSET_CATEGORY_OPTIONS.map((option) => {
            const Icon = assetCategoryIcon(option.value);
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
        placeholder="Search name, serial, owner"
        className={filterToolbarSearchInputClassName}
        aria-label="Search assets"
      />
    </div>
  );
}
