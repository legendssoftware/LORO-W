'use client';

import { useMemo } from 'react';
import { ArrowDownWideNarrow, Coins, Download } from 'lucide-react';
import type { BranchListItem } from '@/api/types/branch';
import {
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
  SearchableBranchPicker,
  SearchableOptionListPicker,
  SearchableUserPicker,
  type ReportsFilterUserPickable,
  type SearchableOptionRow,
} from '@/components/filters/searchable-filter-comboboxes';
import { UtcDateRangePicker } from '@/components/filters/utc-date-range-picker';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import { XIcon } from '@/lib/icons';
import { resolveUserBranchUid } from '@/app/reports/lib/reports-user-branch';
import type { ReportsTargetsCurrencyView } from '@/app/reports/lib/reports-target-currency';
import { cn } from '@/lib/utils';

export type ReportsTargetsSortMetric =
  | 'name'
  | 'achievement'
  | 'sales'
  | 'calls'
  | 'leads'
  | 'hours'
  | 'productivity';

export interface ReportsTargetsToolbarProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  onRangeChange: (range: { start: Date; end: Date }) => void;
  onSetUseAllTime: (value: boolean) => void;
  onResetDateRange: () => void;
  showSearch?: boolean;
  showDimensionFilters?: boolean;
  branches?: BranchListItem[];
  users?: ReportsFilterUserPickable[];
  selectedBranchId?: string;
  onBranchChange?: (branchId: string) => void;
  selectedUserId?: string;
  onUserChange?: (uid: string) => void;
  sortMetric?: ReportsTargetsSortMetric;
  onSortMetricChange?: (metric: ReportsTargetsSortMetric) => void;
  /** Export currently visible/filtered table rows. */
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  exportDisabled?: boolean;
  currencyView?: ReportsTargetsCurrencyView;
  onCurrencyViewChange?: (view: ReportsTargetsCurrencyView) => void;
}

const SORT_OPTIONS: Array<{ value: ReportsTargetsSortMetric; label: string }> = [
  { value: 'name', label: 'Sort: Name' },
  { value: 'achievement', label: 'Sort: Achievement (page)' },
  { value: 'sales', label: 'Sort: Sales (page)' },
  { value: 'calls', label: 'Sort: Calls' },
  { value: 'leads', label: 'Sort: Leads' },
  { value: 'hours', label: 'Sort: Hours' },
  { value: 'productivity', label: 'Sort: Productivity (page)' },
];

const CURRENCY_VIEW_OPTIONS: Array<{ value: ReportsTargetsCurrencyView; label: string }> = [
  { value: 'set', label: 'Currency: Target (set)' },
  { value: 'branch', label: 'Currency: Branch (ERP)' },
  { value: 'zar', label: 'Currency: ZAR (consolidated)' },
];

export function ReportsTargetsToolbar({
  searchInput,
  onSearchInputChange,
  startDate,
  endDate,
  useAllTime,
  onRangeChange,
  onSetUseAllTime,
  onResetDateRange,
  showSearch = true,
  showDimensionFilters = false,
  branches = [],
  users = [],
  selectedBranchId = 'all',
  onBranchChange,
  selectedUserId = 'all',
  onUserChange,
  sortMetric = 'name',
  onSortMetricChange,
  onExportCsv,
  onExportExcel,
  exportDisabled = false,
  currencyView = 'set',
  onCurrencyViewChange,
}: ReportsTargetsToolbarProps) {
  const sortOptions: SearchableOptionRow[] = useMemo(
    () =>
      SORT_OPTIONS.filter((o) => o.value !== 'name').map((o) => ({
        value: o.value,
        label: o.label,
        icon: <ArrowDownWideNarrow className="size-4 shrink-0" />,
      })),
    []
  );

  const currencyOptions: SearchableOptionRow[] = useMemo(
    () =>
      CURRENCY_VIEW_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
        icon: <Coins className="size-4 shrink-0" />,
      })),
    []
  );

  /** Keep user picker in sync with branch — same composition as Overview toolbar. */
  const usersForPicker = useMemo(() => {
    if (selectedBranchId === 'all') return users;
    const branchUid = Number(selectedBranchId);
    if (!Number.isFinite(branchUid)) return users;
    return users.filter((u) => resolveUserBranchUid(u) === branchUid);
  }, [users, selectedBranchId]);

  function renderSearchField(className?: string) {
    if (!showSearch) return null;
    return (
      <div className={cn('relative w-full min-w-0 shrink-0 md:w-56 md:max-w-[16rem]', className)}>
        <Input
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Search name, email, or branch…"
          className={cn(filterToolbarSearchInputClassName, searchInput ? 'pr-8' : undefined)}
          data-tour="reports-targets-search"
          aria-label="Search targets by user"
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => onSearchInputChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }

  const datePicker = (
    <UtcDateRangePicker
      startDate={startDate}
      endDate={endDate}
      onRangeChange={onRangeChange}
      onReset={onResetDateRange}
      showAllTime
      useAllTime={useAllTime}
      onSetUseAllTime={onSetUseAllTime}
      dataTour="reports-targets-date-filter"
    />
  );

  return (
    <div
      className="mb-4 flex shrink-0 flex-wrap items-center gap-2"
      data-tour="reports-targets-toolbar"
    >
      {datePicker}
      {onCurrencyViewChange ? (
        <SearchableOptionListPicker
          options={currencyOptions}
          selectedValue={currencyView}
          onValueChange={(v) =>
            onCurrencyViewChange(v as ReportsTargetsCurrencyView)
          }
          placeholderLabelWhenAll="Currency: Target (set)"
          triggerIcon={<Coins className="size-4" />}
          triggerClassName="min-w-[10rem] sm:min-w-[12rem]"
          searchPlaceholder="Search currency…"
        />
      ) : null}
      {showDimensionFilters ? (
        <>
          <SearchableBranchPicker
            branches={branches}
            selectedBranchId={selectedBranchId}
            onBranchChange={(id) => onBranchChange?.(id)}
            triggerClassName="min-w-[10rem] sm:min-w-[12rem]"
          />
          <SearchableUserPicker
            users={usersForPicker}
            branches={branches}
            selectedUid={selectedUserId}
            onUidChange={(uid) => onUserChange?.(uid)}
            triggerClassName="min-w-[10rem] sm:min-w-[12rem]"
          />
          <SearchableOptionListPicker
            options={sortOptions}
            selectedValue={sortMetric === 'name' ? 'all' : sortMetric}
            onValueChange={(v) =>
              onSortMetricChange?.(
                v === 'all' ? 'name' : (v as ReportsTargetsSortMetric)
              )
            }
            includeAllOption
            allOptionValue="all"
            placeholderLabelWhenAll="Sort: Name"
            triggerIcon={<ArrowDownWideNarrow className="size-4" />}
            triggerClassName="min-w-[10rem] sm:min-w-[12rem]"
            searchPlaceholder="Search sort…"
          />
        </>
      ) : null}
      {showSearch ? (
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
          {onExportCsv || onExportExcel ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5"
                  disabled={exportDisabled}
                  data-tour="reports-targets-export"
                >
                  <Download className="size-4" aria-hidden />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={reportsFilterPortalHighZ}>
                {onExportCsv ? (
                  <DropdownMenuItem
                    disabled={exportDisabled}
                    onSelect={() => onExportCsv()}
                  >
                    Export CSV
                  </DropdownMenuItem>
                ) : null}
                {onExportExcel ? (
                  <DropdownMenuItem
                    disabled={exportDisabled}
                    onSelect={() => onExportExcel()}
                  >
                    Export Excel
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {renderSearchField()}
        </div>
      ) : onExportCsv || onExportExcel ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5"
                disabled={exportDisabled}
                data-tour="reports-targets-export"
              >
                <Download className="size-4" aria-hidden />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={reportsFilterPortalHighZ}>
              {onExportCsv ? (
                <DropdownMenuItem
                  disabled={exportDisabled}
                  onSelect={() => onExportCsv()}
                >
                  Export CSV
                </DropdownMenuItem>
              ) : null}
              {onExportExcel ? (
                <DropdownMenuItem
                  disabled={exportDisabled}
                  onSelect={() => onExportExcel()}
                >
                  Export Excel
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
}
