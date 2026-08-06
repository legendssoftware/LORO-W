'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  Coins,
  Download,
  Filter,
  Globe2,
  MapPinned,
} from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  selectedCountry?: string;
  onCountryChange?: (country: string) => void;
  selectedProvince?: string;
  onProvinceChange?: (province: string) => void;
  countryOptions?: SearchableOptionRow[];
  provinceOptions?: SearchableOptionRow[];
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

interface ReportsTargetsFilterControlsProps
  extends Omit<
    ReportsTargetsToolbarProps,
    'searchInput' | 'onSearchInputChange' | 'showSearch' | 'onExportCsv' | 'onExportExcel' | 'exportDisabled'
  > {
  layout: 'row' | 'stack';
}

function ReportsTargetsFilterControls({
  layout,
  startDate,
  endDate,
  useAllTime,
  onRangeChange,
  onSetUseAllTime,
  onResetDateRange,
  showDimensionFilters = false,
  branches = [],
  users = [],
  selectedBranchId = 'all',
  onBranchChange,
  selectedUserId = 'all',
  onUserChange,
  selectedCountry = 'all',
  onCountryChange,
  selectedProvince = 'all',
  onProvinceChange,
  countryOptions = [],
  provinceOptions = [],
  sortMetric = 'name',
  onSortMetricChange,
  currencyView = 'set',
  onCurrencyViewChange,
}: ReportsTargetsFilterControlsProps) {
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

  const usersForPicker = useMemo(() => {
    if (selectedBranchId === 'all') return users;
    const branchUid = Number(selectedBranchId);
    if (!Number.isFinite(branchUid)) return users;
    return users.filter((u) => resolveUserBranchUid(u) === branchUid);
  }, [users, selectedBranchId]);

  const isStack = layout === 'stack';
  const pickerTriggerClass = isStack
    ? cn(reportsFilterSelectTriggerClass, 'w-full')
    : 'min-w-[10rem] sm:min-w-[12rem]';

  return (
    <div
      className={cn(
        isStack
          ? 'flex flex-col gap-3'
          : 'flex flex-wrap items-center gap-2'
      )}
    >
      <UtcDateRangePicker
        startDate={startDate}
        endDate={endDate}
        onRangeChange={onRangeChange}
        onReset={onResetDateRange}
        showAllTime
        useAllTime={useAllTime}
        onSetUseAllTime={onSetUseAllTime}
        dataTour="reports-targets-date-filter"
        triggerClassName={isStack ? 'w-full' : undefined}
        stackLayout={isStack}
      />
      {onCurrencyViewChange ? (
        <SearchableOptionListPicker
          options={currencyOptions}
          selectedValue={currencyView}
          onValueChange={(v) =>
            onCurrencyViewChange(v as ReportsTargetsCurrencyView)
          }
          placeholderLabelWhenAll="Currency: Target (set)"
          triggerIcon={<Coins className="size-4" />}
          triggerClassName={pickerTriggerClass}
          searchPlaceholder="Search currency…"
        />
      ) : null}
      {showDimensionFilters ? (
        <>
          <SearchableOptionListPicker
            options={countryOptions}
            selectedValue={selectedCountry}
            onValueChange={(v) => onCountryChange?.(v)}
            placeholderLabelWhenAll="All countries"
            searchPlaceholder="Search countries…"
            triggerIcon={<Globe2 className="size-4 shrink-0 text-muted-foreground" />}
            triggerClassName={pickerTriggerClass}
          />
          <SearchableOptionListPicker
            options={provinceOptions}
            selectedValue={selectedProvince}
            onValueChange={(v) => onProvinceChange?.(v)}
            placeholderLabelWhenAll="All provinces"
            searchPlaceholder="Search provinces…"
            triggerIcon={<MapPinned className="size-4 shrink-0 text-muted-foreground" />}
            triggerClassName={pickerTriggerClass}
            disabled={selectedCountry === 'all'}
          />
          <SearchableBranchPicker
            branches={branches}
            selectedBranchId={selectedBranchId}
            onBranchChange={(id) => onBranchChange?.(id)}
            groupByProvince={selectedCountry !== 'all'}
            triggerClassName={pickerTriggerClass}
          />
          <SearchableUserPicker
            users={usersForPicker}
            branches={branches}
            selectedUid={selectedUserId}
            onUidChange={(uid) => onUserChange?.(uid)}
            triggerClassName={pickerTriggerClass}
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
            triggerClassName={pickerTriggerClass}
            searchPlaceholder="Search sort…"
          />
        </>
      ) : null}
    </div>
  );
}

export function ReportsTargetsToolbar({
  searchInput,
  onSearchInputChange,
  showSearch = true,
  onExportCsv,
  onExportExcel,
  exportDisabled = false,
  ...filterProps
}: ReportsTargetsToolbarProps) {
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);

  useEffect(() => {
    function onResize() {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setFiltersDialogOpen(false);
      }
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  function renderExportButton() {
    if (!onExportCsv && !onExportExcel) return null;
    return (
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
    );
  }

  const hasExport = Boolean(onExportCsv || onExportExcel);
  const hasMobileActions = showSearch || hasExport;

  return (
    <div data-tour="reports-targets-toolbar">
      <div className="mb-4 flex shrink-0 flex-col gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-center gap-2"
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="size-4 shrink-0" aria-hidden />
          Filter
        </Button>
        {hasMobileActions ? (
          <div className="flex min-w-0 items-center gap-2">
            {renderExportButton()}
            {renderSearchField('min-w-0 flex-1')}
          </div>
        ) : null}
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-x-hidden overflow-y-auto p-4 sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Date range, currency, location, and sort for the targets table.
            </DialogDescription>
          </DialogHeader>
          <ReportsTargetsFilterControls layout="stack" {...filterProps} />
        </DialogContent>
      </Dialog>

      <div className="mb-4 hidden shrink-0 flex-wrap items-center gap-2 md:flex">
        <ReportsTargetsFilterControls layout="row" {...filterProps} />
        {showSearch ? (
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
            {renderExportButton()}
            {renderSearchField()}
          </div>
        ) : hasExport ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {renderExportButton()}
          </div>
        ) : null}
      </div>
    </div>
  );
}
