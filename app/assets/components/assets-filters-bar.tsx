'use client';

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
import { cn } from '@/lib/utils';

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
  actions,
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
          {canManage ? (
            <Select value={scope} onValueChange={(value) => onScopeChange(value as AssetScope)}>
              <SelectTrigger className="h-9 w-48 shrink-0 border-border bg-background" aria-label={t('pages.assets.scopeAria')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mine">
                  <User className="size-4 text-muted-foreground" />
                  {t('pages.assets.myAssets')}
                </SelectItem>
                <SelectItem value="org">
                  <Building2 className="size-4 text-muted-foreground" />
                  {t('pages.assets.organisation')}
                </SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <Select
            value={category}
            onValueChange={(value) => onCategoryChange(value as AssetCategory | 'all')}
          >
            <SelectTrigger className="h-9 w-48 shrink-0 border-border bg-background" aria-label={t('pages.assets.categoryAria')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <Boxes className="size-4 text-muted-foreground" />
                {t('pages.assets.allCategories')}
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
        </div>
      </div>
      <div className="flex shrink-0 flex-nowrap items-center gap-2">
        <Input
          value={searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('pages.assets.searchPlaceholder')}
          className={cn(filterToolbarSearchInputClassName, 'w-56 max-w-[16rem]')}
          aria-label={t('pages.assets.searchAria')}
        />
        {actions}
      </div>
    </div>
  );
}
