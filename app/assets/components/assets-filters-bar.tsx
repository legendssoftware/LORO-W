'use client';

import type { AssetCategory } from '@/api/types/asset';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ASSET_CATEGORY_OPTIONS } from '../lib/asset-display';

type AssetScope = 'mine' | 'org';

export function AssetsFiltersBar({
  canManage,
  scope,
  onScopeChange,
  searchInput,
  onSearchChange,
  category,
  onCategoryChange,
}: {
  canManage: boolean;
  scope: AssetScope;
  onScopeChange: (scope: AssetScope) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  category: AssetCategory | 'all';
  onCategoryChange: (value: AssetCategory | 'all') => void;
}) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
      {canManage ? (
        <Select value={scope} onValueChange={(value) => onScopeChange(value as AssetScope)}>
          <SelectTrigger className="h-9 w-full border-border bg-background sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mine">My assets</SelectItem>
            <SelectItem value="org">Organisation</SelectItem>
          </SelectContent>
        </Select>
      ) : null}
      <Input
        value={searchInput}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search name, serial, owner"
        className={filterToolbarSearchInputClassName}
      />
      <Select
        value={category}
        onValueChange={(value) => onCategoryChange(value as AssetCategory | 'all')}
      >
        <SelectTrigger className="h-9 w-full border-border bg-background sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {ASSET_CATEGORY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
