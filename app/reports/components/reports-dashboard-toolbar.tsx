'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon, Filter, Globe2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  formatUtcCalendarLabel,
  formatUtcYmd,
  getUtcMonthRange,
  orderUtcCalendarRange,
  utcToday,
} from '@/lib/utils/overview-daily-summary';
import { resolveUserBranchUid } from '@/app/reports/lib/reports-user-branch';
import { getCountryFlag } from '@/lib/utils/country-flags';
import { cn } from '@/lib/utils';

/** ERP country codes used by stores/products sales (ALL expands server-side). */
export const REPORTS_OVERVIEW_ERP_COUNTRIES = [
  'SA',
  'BOT',
  'ZAM',
  'MOZ',
  'ZW',
  'MAL',
  'CON',
  'TAN',
] as const;

export type ReportsOverviewErpCountry =
  (typeof REPORTS_OVERVIEW_ERP_COUNTRIES)[number];

export interface ReportsDashboardToolbarProps {
  startDate: Date;
  endDate: Date;
  onRangeChange: (range: { start: Date; end: Date }) => void;
  /** When true, show branch / user / country pickers. */
  showDimensionFilters?: boolean;
  branches?: BranchListItem[];
  users?: ReportsFilterUserPickable[];
  selectedBranchId?: string;
  onBranchChange?: (branchId: string) => void;
  selectedUserId?: string;
  onUserChange?: (uid: string) => void;
  selectedCountry?: string;
  onCountryChange?: (country: string) => void;
  /** Persist filters to user preferences when enabled. */
  rememberSettings?: boolean;
  onRememberSettingsChange?: (enabled: boolean) => void;
  rememberSettingsDisabled?: boolean;
}

interface ReportsDashboardFilterControlsProps
  extends ReportsDashboardToolbarProps {
  layout: 'row' | 'stack';
}

function ReportsDashboardFilterControls({
  layout,
  startDate,
  endDate,
  onRangeChange,
  showDimensionFilters = false,
  branches = [],
  users = [],
  selectedBranchId = 'all',
  onBranchChange,
  selectedUserId = 'all',
  onUserChange,
  selectedCountry = 'all',
  onCountryChange,
  rememberSettings = false,
  onRememberSettingsChange,
  rememberSettingsDisabled = false,
}: ReportsDashboardFilterControlsProps) {
  const [dateRangePopoverOpen, setDateRangePopoverOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });
  const skipApplyOnCloseRef = useRef(false);

  const today = utcToday();
  const month = getUtcMonthRange(today);
  const isCurrentMonth =
    formatUtcYmd(startDate) === month.from &&
    formatUtcYmd(endDate) === month.to;

  const rangeLabel =
    formatUtcYmd(startDate) === formatUtcYmd(endDate)
      ? formatUtcCalendarLabel(startDate)
      : `${formatUtcCalendarLabel(startDate)} – ${formatUtcCalendarLabel(endDate)}`;

  const countryOptions: SearchableOptionRow[] = useMemo(
    () =>
      REPORTS_OVERVIEW_ERP_COUNTRIES.map((code) => {
        const info = getCountryFlag(code);
        return {
          value: code,
          label: `${info.flag} ${info.name}`,
          searchExtra: `${code} ${info.name}`,
        };
      }),
    []
  );

  const usersForPicker = useMemo(() => {
    if (selectedBranchId === 'all') return users;
    const branchUid = Number(selectedBranchId);
    if (!Number.isFinite(branchUid)) return users;
    return users.filter((u) => resolveUserBranchUid(u) === branchUid);
  }, [users, selectedBranchId]);

  const handleDatePopoverOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        skipApplyOnCloseRef.current = false;
        setDraft({ from: startDate, to: endDate });
        setDateRangePopoverOpen(true);
        return;
      }
      if (!skipApplyOnCloseRef.current && draft?.from) {
        const from = draft.from;
        const to = draft.to ?? draft.from;
        onRangeChange(orderUtcCalendarRange(from, to));
      }
      skipApplyOnCloseRef.current = false;
      setDateRangePopoverOpen(false);
    },
    [draft, onRangeChange, startDate, endDate]
  );

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
      <Popover
        open={dateRangePopoverOpen}
        onOpenChange={handleDatePopoverOpenChange}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'h-9 gap-2 font-normal',
              isStack && 'w-full justify-start',
              !isCurrentMonth && 'border-violet-300'
            )}
          >
            <CalendarIcon className="size-4 shrink-0 opacity-70" aria-hidden />
            <span className="truncate">{rangeLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('w-auto p-0', reportsFilterPortalHighZ)}
          align="start"
        >
          <Calendar
            mode="range"
            selected={draft}
            onSelect={setDraft}
            numberOfMonths={isStack ? 1 : 2}
            defaultMonth={startDate}
          />
          <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                skipApplyOnCloseRef.current = true;
                setDateRangePopoverOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!draft?.from) return;
                onRangeChange(
                  orderUtcCalendarRange(draft.from, draft.to ?? draft.from)
                );
                skipApplyOnCloseRef.current = true;
                setDateRangePopoverOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {showDimensionFilters ? (
        <>
          <SearchableBranchPicker
            branches={branches}
            selectedBranchId={selectedBranchId}
            onBranchChange={(id) => onBranchChange?.(id)}
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
            options={countryOptions}
            selectedValue={selectedCountry}
            onValueChange={(v) => onCountryChange?.(v)}
            placeholderLabelWhenAll="All countries"
            searchPlaceholder="Search countries…"
            triggerIcon={<Globe2 className="size-4 shrink-0 text-muted-foreground" />}
            triggerClassName={pickerTriggerClass}
          />
        </>
      ) : null}

      {onRememberSettingsChange ? (
        <div
          className={cn(
            'flex items-center gap-2',
            !isStack && 'ml-auto'
          )}
        >
          <Switch
            id={isStack ? 'reports-remember-settings-dialog' : 'reports-remember-settings'}
            checked={rememberSettings}
            disabled={rememberSettingsDisabled}
            onCheckedChange={onRememberSettingsChange}
            aria-label="remember my settings"
          />
          <Label
            htmlFor={
              isStack ? 'reports-remember-settings-dialog' : 'reports-remember-settings'
            }
            className="cursor-pointer text-sm font-normal text-muted-foreground"
          >
            remember my settings
          </Label>
        </div>
      ) : null}
    </div>
  );
}

export function ReportsDashboardToolbar(props: ReportsDashboardToolbarProps) {
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

  return (
    <div data-slot="reports-dashboard-toolbar">
      <div className="flex md:hidden">
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-center gap-2"
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="size-4 shrink-0" aria-hidden />
          Filter
        </Button>
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Date range, branch, user, and country for overview metrics.
            </DialogDescription>
          </DialogHeader>
          <ReportsDashboardFilterControls layout="stack" {...props} />
        </DialogContent>
      </Dialog>

      <div className="hidden md:flex flex-wrap items-center gap-2">
        <ReportsDashboardFilterControls layout="row" {...props} />
      </div>
    </div>
  );
}
