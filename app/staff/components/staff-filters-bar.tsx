'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Check,
  ChevronsUpDown,
  Filter,
  LayoutGrid,
  Users,
} from 'lucide-react';
import {
  SearchableOptionListPicker,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
  type SearchableOptionRow,
} from '@/components/filters/searchable-filter-comboboxes';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { XIcon } from '@/lib/icons';
import type { BranchListItem } from '@/api/types/branch';
import { getBranchDisplayLabel } from '@/api/types/branch';
import {
  getCountryFlag,
  normalizeBranchCountryCodeForGrouping,
} from '@/lib/utils/country-flags';
import { statusFilterIconClass } from '@/lib/status-filter-icon';
import { CLOCK_IN_OPTION_DISPLAY_KEYS } from '@/lib/clock-in-options';
import {
  STAFF_STATUS_FILTER_OPTIONS,
  STAFF_DIMENSION_FILTER_ALL,
  STAFF_DIMENSION_FILTER_NONE,
} from '@/lib/staff-filter-utils';
import { cn } from '@/lib/utils';
import type { StatusFilter } from '@/lib/types/staff-report-types';

/** `screens` i18n key for each status filter option label. */
const STAFF_STATUS_LABEL_KEYS: Record<StatusFilter, string> = {
  all: 'actions.all',
  present: 'chrome.staff.status.present',
  absent: 'chrome.staff.status.absent',
  late: 'chrome.staff.status.late',
  early: 'chrome.staff.status.early',
  behind_on_hours: 'chrome.staff.status.behindOnHours',
  idle: 'chrome.staff.status.idle',
  no_clock_in_gt_2: 'chrome.staff.status.noClockIn2',
  no_clock_in_gt_7: 'chrome.staff.status.noClockIn7',
  no_clock_in_gt_10: 'chrome.staff.status.noClockIn10',
  at_office: CLOCK_IN_OPTION_DISPLAY_KEYS.at_office,
  work_from_home: CLOCK_IN_OPTION_DISPLAY_KEYS.work_from_home,
  starting_from_home: CLOCK_IN_OPTION_DISPLAY_KEYS.starting_from_home,
  offsite: CLOCK_IN_OPTION_DISPLAY_KEYS.offsite,
  driving: CLOCK_IN_OPTION_DISPLAY_KEYS.driving,
  sales_warning_1: 'chrome.staff.status.warning1',
  sales_warning_2: 'chrome.staff.status.warning2',
  sales_warning_3: 'chrome.staff.status.warning3',
  with_vehicle: 'chrome.staff.status.withVehicle',
  without_vehicle: 'chrome.staff.status.withoutVehicle',
  with_targets: 'chrome.staff.status.withTargets',
  without_targets: 'chrome.staff.status.withoutTargets',
  with_sales_code: 'chrome.staff.status.withSalesCode',
  without_sales_code: 'chrome.staff.status.withoutSalesCode',
  with_hrid: 'chrome.staff.status.withHrid',
  without_hrid: 'chrome.staff.status.withoutHrid',
};

const selectTriggerClass =
  'h-9 w-full border-border bg-background text-foreground sm:w-auto';

function flagForStaffBranchLabel(
  label: string,
  branches: BranchListItem[]
): string | null {
  const needle = label.trim().toLowerCase();
  if (!needle || needle === 'all branches' || needle === 'unassigned') return null;
  const match = branches.find((branch) => {
    const display = getBranchDisplayLabel(branch).trim().toLowerCase();
    const name = (branch.name ?? '').trim().toLowerCase();
    const alias = (branch.alias ?? '').trim().toLowerCase();
    return display === needle || name === needle || alias === needle;
  });
  if (!match) return null;
  return getCountryFlag(normalizeBranchCountryCodeForGrouping(match)).flag;
}

function StaffBranchFlag({
  label,
  branches,
}: {
  label: string;
  branches: BranchListItem[];
}) {
  const flag = flagForStaffBranchLabel(label, branches);
  if (!flag) return null;
  return (
    <span className="shrink-0 text-base leading-none" aria-hidden>
      {flag}
    </span>
  );
}

export interface StaffDimensionFilterItem {
  value: string;
  label: string;
}

export interface StaffFilterControlsProps {
  layout: 'row' | 'stack';
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  roleFilter: string;
  onRoleFilterChange: (v: string) => void;
  roleFilterItems: StaffDimensionFilterItem[];
  workforceFilter: string;
  onWorkforceFilterChange: (v: string) => void;
  workforceFilterItems: StaffDimensionFilterItem[];
  branchFilter: string;
  onBranchFilterChange: (v: string) => void;
  branchFilterItems: StaffDimensionFilterItem[];
  /** Loaded branches, used to show a country flag beside each branch name. */
  branches?: BranchListItem[];
  branchFilterTriggerLabel: string;
  branchPickerOpen: boolean;
  onBranchPickerOpenChange: (open: boolean) => void;
  countryFilter: string;
  onCountryFilterChange: (v: string) => void;
  countryFilterItems: StaffDimensionFilterItem[];
  countryFilterTriggerLabel: string;
  countryPickerOpen: boolean;
  onCountryPickerOpenChange: (open: boolean) => void;
}

export function StaffFilterControls({
  layout,
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
  roleFilterItems,
  workforceFilter,
  onWorkforceFilterChange,
  workforceFilterItems,
  branchFilter,
  onBranchFilterChange,
  branchFilterItems,
  branches = [],
  branchFilterTriggerLabel,
  branchPickerOpen,
  onBranchPickerOpenChange,
  countryFilter,
  onCountryFilterChange,
  countryFilterItems,
  countryFilterTriggerLabel,
  countryPickerOpen,
  onCountryPickerOpenChange,
}: StaffFilterControlsProps) {
  const { t } = useTranslation('screens');
  const row = layout === 'row';
  const dimensionLabel = React.useCallback(
    (item: StaffDimensionFilterItem, allKey: string) => {
      if (item.value === STAFF_DIMENSION_FILTER_ALL) return t(allKey);
      if (item.value === STAFF_DIMENSION_FILTER_NONE) return t('chrome.staff.unassigned');
      return item.label;
    },
    [t]
  );
  const branchTriggerText =
    branchFilter === STAFF_DIMENSION_FILTER_ALL ? t('actions.allBranches') : branchFilterTriggerLabel;
  const countryTriggerText =
    countryFilter === STAFF_DIMENSION_FILTER_ALL
      ? t('chrome.staff.allCountries')
      : countryFilterTriggerLabel;
  const statusTrigger = row
    ? 'h-9 min-w-0 w-[260px] shrink-0'
    : 'h-9 w-full min-w-0';
  const roleTrigger = row
    ? 'h-9 min-w-0 w-[140px] shrink-0'
    : 'h-9 w-full min-w-0';
  const workforceTrigger = row
    ? 'h-9 min-w-0 w-[160px] shrink-0'
    : 'h-9 w-full min-w-0';
  const branchBtn = row
    ? 'h-9 min-w-0 w-[160px] shrink-0'
    : 'h-9 min-w-0 w-full';
  const countryBtn = row
    ? 'h-9 min-w-0 w-[160px] shrink-0'
    : 'h-9 min-w-0 w-full';

  const statusPickerOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      STAFF_STATUS_FILTER_OPTIONS.filter((o) => o.value !== 'all').map((opt) => {
        const Icon = opt.icon;
        return {
          value: opt.value,
          label: t(STAFF_STATUS_LABEL_KEYS[opt.value]),
          icon: (
            <Icon
              className={cn('size-4 shrink-0', statusFilterIconClass(opt.value))}
              size={16}
            />
          ),
        };
      }),
    [t]
  );

  const rolePickerOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      roleFilterItems
        .filter((i) => i.value !== STAFF_DIMENSION_FILTER_ALL)
        .map((opt) => ({
          value: opt.value,
          label: dimensionLabel(opt, 'chrome.staff.allRoles'),
          icon: <Briefcase className="size-4 shrink-0" />,
        })),
    [roleFilterItems, dimensionLabel]
  );

  const workforcePickerOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      workforceFilterItems
        .filter((i) => i.value !== STAFF_DIMENSION_FILTER_ALL)
        .map((opt) => ({
          value: opt.value,
          label: dimensionLabel(opt, 'chrome.staff.allWorkforceTypes'),
          icon: <Users className="size-4 shrink-0" />,
        })),
    [workforceFilterItems, dimensionLabel]
  );

  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  return (
    <div className={wrapClass}>
      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
          options={statusPickerOptions}
          placeholderLabelWhenAll={t('actions.all')}
          searchPlaceholder={t('chrome.staff.searchStatus')}
          emptyMessage={t('actions.noStatusFound')}
          triggerIcon={<LayoutGrid className="size-4 shrink-0" />}
          triggerClassName={statusTrigger}
        />
        {statusFilter !== 'all' ? (
          <button
            type="button"
            onClick={() => onStatusFilterChange('all')}
            className="shrink-0 rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto h-9 w-9 flex items-center justify-center"
            aria-label={t('actions.clearStatusFilter')}
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={roleFilter}
          onValueChange={onRoleFilterChange}
          options={rolePickerOptions}
          allOptionValue={STAFF_DIMENSION_FILTER_ALL}
          placeholderLabelWhenAll={t('chrome.staff.allRoles')}
          searchPlaceholder={t('chrome.staff.searchRoles')}
          emptyMessage={t('chrome.staff.noRoleFound')}
          triggerIcon={<Briefcase className="size-4 shrink-0" />}
          triggerClassName={roleTrigger}
        />
        {roleFilter !== STAFF_DIMENSION_FILTER_ALL ? (
          <button
            type="button"
            onClick={() => onRoleFilterChange(STAFF_DIMENSION_FILTER_ALL)}
            className="shrink-0 rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto h-9 w-9 flex items-center justify-center"
            aria-label={t('chrome.lists.clearRoleFilter')}
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={workforceFilter}
          onValueChange={onWorkforceFilterChange}
          options={workforcePickerOptions}
          allOptionValue={STAFF_DIMENSION_FILTER_ALL}
          placeholderLabelWhenAll={t('chrome.staff.allWorkforceTypes')}
          searchPlaceholder={t('chrome.staff.searchWorkforceTypes')}
          emptyMessage={t('chrome.staff.noTypeFound')}
          triggerIcon={<Users className="size-4 shrink-0" />}
          triggerClassName={workforceTrigger}
        />
        {workforceFilter !== STAFF_DIMENSION_FILTER_ALL ? (
          <button
            type="button"
            onClick={() => onWorkforceFilterChange(STAFF_DIMENSION_FILTER_ALL)}
            className="shrink-0 rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto h-9 w-9 flex items-center justify-center"
            aria-label={t('chrome.lists.clearWorkforceFilter')}
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <Popover open={branchPickerOpen} onOpenChange={onBranchPickerOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={branchPickerOpen}
              className={cn(
                reportsFilterSelectTriggerClass,
                'justify-between font-normal',
                branchBtn
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <StaffBranchFlag label={branchFilterTriggerLabel} branches={branches} />
                <span className="truncate">{branchTriggerText}</span>
              </span>
              <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn(
              'w-[var(--radix-popover-trigger-width)] min-w-[200px] max-w-[min(100vw-2rem,24rem)] p-0',
              reportsFilterPortalHighZ
            )}
            align="start"
          >
            <Command>
              <CommandInput placeholder={t('chrome.lists.searchBranches')} />
              <CommandList>
                <CommandEmpty>{t('chrome.lists.noBranchFound')}</CommandEmpty>
                <CommandGroup>
                  {branchFilterItems.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.value}`}
                      onSelect={() => {
                        onBranchFilterChange(opt.value);
                        onBranchPickerOpenChange(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'size-4 shrink-0',
                          branchFilter === opt.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                        <StaffBranchFlag label={opt.label} branches={branches} />
                        {dimensionLabel(opt, 'actions.allBranches')}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {branchFilter !== STAFF_DIMENSION_FILTER_ALL ? (
          <button
            type="button"
            onClick={() => onBranchFilterChange(STAFF_DIMENSION_FILTER_ALL)}
            className="shrink-0 rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto h-9 w-9 flex items-center justify-center"
            aria-label={t('chrome.lists.clearBranchFilter')}
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      <div className={cn('flex items-center gap-1 min-w-0', !row && 'w-full')}>
        <Popover open={countryPickerOpen} onOpenChange={onCountryPickerOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={countryPickerOpen}
              className={cn(
                reportsFilterSelectTriggerClass,
                'justify-between font-normal',
                countryBtn
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate">{countryTriggerText}</span>
              </span>
              <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn(
              'w-[var(--radix-popover-trigger-width)] min-w-[200px] max-w-[min(100vw-2rem,24rem)] p-0',
              reportsFilterPortalHighZ
            )}
            align="start"
          >
            <Command>
              <CommandInput placeholder={t('chrome.lists.searchCountries')} />
              <CommandList>
                <CommandEmpty>{t('chrome.lists.noCountryFound')}</CommandEmpty>
                <CommandGroup>
                  {countryFilterItems.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.value}`}
                      onSelect={() => {
                        onCountryFilterChange(opt.value);
                        onCountryPickerOpenChange(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'size-4 shrink-0',
                          countryFilter === opt.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                        {dimensionLabel(opt, 'chrome.staff.allCountries')}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {countryFilter !== STAFF_DIMENSION_FILTER_ALL ? (
          <button
            type="button"
            onClick={() => onCountryFilterChange(STAFF_DIMENSION_FILTER_ALL)}
            className="shrink-0 rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto h-9 w-9 flex items-center justify-center"
            aria-label={t('chrome.lists.clearCountryFilter')}
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface StaffFiltersBarProps
  extends Omit<StaffFilterControlsProps, 'layout'> {
  search: string;
  onSearchChange: (value: string) => void;
  actions?: React.ReactNode;
}

export function StaffFiltersBar({
  search,
  onSearchChange,
  actions,
  ...filterProps
}: StaffFiltersBarProps) {
  const { t } = useTranslation('screens');
  const [filtersDialogOpen, setFiltersDialogOpen] = React.useState(false);

  React.useEffect(() => {
    function onResize() {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setFiltersDialogOpen(false);
      }
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function renderSearchField() {
    return (
      <div className="relative min-w-0 flex-1 md:w-72 md:max-w-[20rem] md:flex-none">
        <Input
          placeholder={t('chrome.staff.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(filterToolbarSearchInputClassName, search && 'pr-8')}
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground"
            aria-label={t('actions.clearSearch')}
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 shrink-0 mb-4" data-tour="staff-toolbar">
      <div className="flex md:hidden flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn(selectTriggerClass, 'h-9 w-full justify-center min-w-0')}
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="mr-2 size-4 shrink-0" aria-hidden />
          {t('actions.filter')}
        </Button>
        <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {renderSearchField()}
          {actions}
        </div>
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('actions.filters')}</DialogTitle>
            <DialogDescription>
              {t('chrome.staff.filtersDescription')}
            </DialogDescription>
          </DialogHeader>
          <StaffFilterControls {...filterProps} layout="stack" />
        </DialogContent>
      </Dialog>

      <div className="hidden md:flex w-full min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <StaffFilterControls {...filterProps} layout="row" />
          </div>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          {renderSearchField()}
          {actions}
        </div>
      </div>
    </div>
  );
}
