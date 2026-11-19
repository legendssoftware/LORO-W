'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  Coins,
  Download,
  Filter,
  Loader2,
  MapPinned,
  Tags,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useTranslation } from 'react-i18next';

export type ReportsTargetsSortMetric =
  | 'name'
  | 'achievement'
  | 'sales'
  | 'quotations'
  | 'calls'
  | 'visits'
  | 'leads'
  | 'hours'
  | 'travel'
  | 'productivity'
  | 'policy';

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
  onExportPdf?: () => void;
  /** Download the multi-sheet visits/travel workbook for the current date filters. */
  onExportTravel?: () => void;
  exportDisabled?: boolean;
  travelExportLoading?: boolean;
  currencyView?: ReportsTargetsCurrencyView;
  onCurrencyViewChange?: (view: ReportsTargetsCurrencyView) => void;
  /** ERP customer categories for the selected dates. Unchecked codes are excluded from sales. */
  customerCategories?: Array<{ id: string; name: string }>;
  excludedCustomerCategoryIds?: string[];
  onExcludedCustomerCategoriesChange?: (ids: string[]) => void;
}

const SORT_OPTIONS: Array<{ value: ReportsTargetsSortMetric; labelKey: string }> = [
  { value: 'name', labelKey: 'chrome.reports.sort.name' },
  { value: 'achievement', labelKey: 'chrome.reports.sort.achievement' },
  { value: 'sales', labelKey: 'chrome.reports.sort.sales' },
  { value: 'quotations', labelKey: 'chrome.reports.sort.quotations' },
  { value: 'calls', labelKey: 'chrome.reports.sort.calls' },
  { value: 'visits', labelKey: 'chrome.reports.sort.visits' },
  { value: 'leads', labelKey: 'chrome.reports.sort.leads' },
  { value: 'hours', labelKey: 'chrome.reports.sort.hours' },
  { value: 'travel', labelKey: 'chrome.reports.sort.travel' },
  { value: 'productivity', labelKey: 'chrome.reports.sort.productivity' },
  { value: 'policy', labelKey: 'chrome.reports.sort.policy' },
];

const CURRENCY_VIEW_OPTIONS: Array<{ value: ReportsTargetsCurrencyView; labelKey: string }> = [
  { value: 'set', labelKey: 'chrome.reports.currency.set' },
  { value: 'branch', labelKey: 'chrome.reports.currency.branch' },
  { value: 'zar', labelKey: 'chrome.reports.currency.zar' },
];

interface ReportsTargetsFilterControlsProps
  extends Omit<
    ReportsTargetsToolbarProps,
    'searchInput' | 'onSearchInputChange' | 'showSearch' | 'onExportCsv' | 'onExportExcel' | 'onExportPdf' | 'onExportTravel' | 'exportDisabled' | 'travelExportLoading'
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
  customerCategories = [],
  excludedCustomerCategoryIds = [],
  onExcludedCustomerCategoriesChange,
}: ReportsTargetsFilterControlsProps) {
  const { t } = useTranslation('screens');
  const sortOptions: SearchableOptionRow[] = useMemo(
    () =>
      SORT_OPTIONS.filter((o) => o.value !== 'name').map((o) => ({
        value: o.value,
        label: t(o.labelKey),
        icon: <ArrowDownWideNarrow className="size-4 shrink-0" />,
      })),
    [t]
  );

  const currencyOptions: SearchableOptionRow[] = useMemo(
    () =>
      CURRENCY_VIEW_OPTIONS.map((o) => ({
        value: o.value,
        label: t(o.labelKey),
        icon: <Coins className="size-4 shrink-0" />,
      })),
    [t]
  );

  const usersForPicker = useMemo(() => {
    if (selectedBranchId === 'all') return users;
    const branchUid = Number(selectedBranchId);
    if (!Number.isFinite(branchUid)) return users;
    return users.filter((u) => resolveUserBranchUid(u) === branchUid);
  }, [users, selectedBranchId]);

  const excludedCategorySet = useMemo(
    () => new Set(excludedCustomerCategoryIds),
    [excludedCustomerCategoryIds]
  );
  const excludedCount = customerCategories.filter((category) =>
    excludedCategorySet.has(category.id)
  ).length;

  const isStack = layout === 'stack';
  const pickerTriggerClass = isStack
    ? cn(reportsFilterSelectTriggerClass, 'w-full')
    : 'h-9 min-w-[10rem] shrink-0 sm:min-w-[12rem]';

  return (
    <div
      className={cn(
        isStack
          ? 'flex flex-col gap-3'
          : 'flex flex-nowrap items-center gap-2'
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
        defaultPreset="today"
        dataTour="reports-targets-date-filter"
        triggerClassName={isStack ? 'w-full' : undefined}
        stackLayout={isStack}
      />
      {customerCategories.length > 0 && onExcludedCustomerCategoriesChange ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'h-9 gap-2 font-normal',
                isStack && 'w-full justify-start',
                excludedCount > 0 && 'border-violet-300'
              )}
            >
              <Tags className="size-4 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">
                {excludedCount > 0
                  ? `Categories: ${excludedCount} excluded`
                  : 'All categories'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className={cn('w-80 p-3', reportsFilterPortalHighZ)}
          >
            <p className="mb-2 text-sm font-medium">{t('chrome.reports.customerCategories')}</p>
            <p className="mb-2 text-xs text-muted-foreground">
              {t('chrome.reports.customerCategoriesHint')}
            </p>
            <ScrollArea className="h-48">
              <div className="space-y-1 pr-3">
                {customerCategories.map((category) => {
                  const checked = !excludedCategorySet.has(category.id);
                  return (
                    <label
                      key={category.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          const exclude = new Set(excludedCategorySet);
                          if (next) exclude.delete(category.id);
                          else exclude.add(category.id);
                          onExcludedCustomerCategoriesChange(
                            customerCategories
                              .map((item) => item.id)
                              .filter((id) => exclude.has(id))
                          );
                        }}
                      />
                      <span className="min-w-0 truncate">{category.name}</span>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      ) : null}
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
            placeholderLabelWhenAll={t('chrome.reports.allCountries')}
            searchPlaceholder={t('chrome.reports.searchCountries')}
            triggerClassName={pickerTriggerClass}
          />
          {selectedCountry !== 'all' ? (
            <SearchableOptionListPicker
              options={provinceOptions}
              selectedValue={selectedProvince}
              onValueChange={(v) => onProvinceChange?.(v)}
              placeholderLabelWhenAll="All provinces"
              searchPlaceholder="Search provinces…"
              triggerIcon={<MapPinned className="size-4 shrink-0 text-muted-foreground" />}
              triggerClassName={pickerTriggerClass}
            />
          ) : null}
          {selectedCountry !== 'all' ? (
            <SearchableBranchPicker
              branches={branches}
              selectedBranchId={selectedBranchId}
              onBranchChange={(id) => onBranchChange?.(id)}
              groupByProvince
              triggerClassName={pickerTriggerClass}
            />
          ) : null}
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
  onExportPdf,
  onExportTravel,
  exportDisabled = false,
  travelExportLoading = false,
  ...filterProps
}: ReportsTargetsToolbarProps) {
  const { t } = useTranslation('screens');
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
          placeholder={t('chrome.reports.searchTargetsPlaceholder')}
          className={cn(filterToolbarSearchInputClassName, searchInput ? 'pr-8' : undefined)}
          data-tour="reports-targets-search"
          aria-label={t('chrome.reports.searchTargetsByUser')}
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => onSearchInputChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('actions.clearSearch')}
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }

  function renderExportButton() {
    if (!onExportCsv && !onExportExcel && !onExportPdf && !onExportTravel) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5"
            disabled={(exportDisabled && !onExportTravel) || travelExportLoading}
            data-tour="reports-targets-export"
          >
            {travelExportLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            {t('actions.export')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={reportsFilterPortalHighZ}>
          {onExportCsv ? (
            <DropdownMenuItem
              disabled={exportDisabled}
              onSelect={() => onExportCsv()}
            >
              {t('actions.exportCsv')}
            </DropdownMenuItem>
          ) : null}
          {onExportExcel ? (
            <DropdownMenuItem
              disabled={exportDisabled}
              onSelect={() => onExportExcel()}
            >
              {t('chrome.reports.exportExcel')}
            </DropdownMenuItem>
          ) : null}
          {onExportPdf ? (
            <DropdownMenuItem
              disabled={exportDisabled}
              onSelect={() => onExportPdf()}
            >
              {t('actions.exportPdf')}
            </DropdownMenuItem>
          ) : null}
          {onExportTravel ? (
            <DropdownMenuItem
              disabled={travelExportLoading || filterProps.useAllTime}
              onSelect={() => onExportTravel()}
            >
              {t('chrome.reports.travelReportExcel')}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const hasExport = Boolean(onExportCsv || onExportExcel || onExportPdf || onExportTravel);
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
          {t('actions.filter')}
        </Button>
        {hasMobileActions ? (
          <div className="flex min-w-0 items-center gap-2">
            {renderSearchField('min-w-0 flex-1')}
            {renderExportButton()}
          </div>
        ) : null}
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-x-hidden overflow-y-auto p-4 sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle>{t('actions.filters')}</DialogTitle>
            <DialogDescription>
              {t('chrome.reports.targetsFiltersDescription')}
            </DialogDescription>
          </DialogHeader>
          <ReportsTargetsFilterControls layout="stack" {...filterProps} />
        </DialogContent>
      </Dialog>

      <div className="mb-4 hidden w-full min-w-0 items-center gap-2 md:flex">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <ReportsTargetsFilterControls layout="row" {...filterProps} />
          </div>
        </div>
        {showSearch || hasExport ? (
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            {showSearch ? renderSearchField() : null}
            {renderExportButton()}
          </div>
        ) : null}
      </div>
    </div>
  );
}
