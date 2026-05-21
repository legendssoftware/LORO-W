'use client';

import type { ComponentType, ReactNode } from 'react';
import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import {
  Map as MapIcon,
  List,
  Table2,
  MoreHorizontal,
  CalendarIcon,
  Filter,
} from 'lucide-react';
import type { UserListItem } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import {
  SearchableOptionListPicker,
  SearchableUserPicker,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
  type SearchableOptionRow,
} from '@/app/reports/components/reports-searchable-filter-comboboxes';
import {
  formatUtcCalendarLabel,
  formatUtcYmd,
  getUtcMonthRange,
  orderUtcCalendarRange,
  utcCalendarDateFromLocalPickerDate,
  utcDateFromYmd,
  utcMonthStartThroughToday,
  utcToday,
} from '@/app/reports/utils/overview-daily-summary';
import { Button } from '@/components/ui/button';
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
import { Calendar } from '@/components/ui/calendar';
import { XIcon, MapPinIcon, BriefcaseIcon } from '@/lib/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useVisitsStore } from '@/store/visits-store';
import { cn } from '@/lib/utils';

const selectTriggerClass =
  'h-9 w-full bg-white border-gray-200 text-foreground sm:w-auto';

/** Matches icons used in `TYPE_OF_BUSINESS_OPTIONS` (lucide + class components). */
export type VisitHistoryBusinessIcon = ComponentType<{ className?: string; size?: number }>;

export interface VisitHistoryToolbarProps {
  uniqueRegions: string[];
  uniqueBusinessTypes: string[];
  businessTypeLabelMap: Map<string, string>;
  businessTypeIconMap: Map<string, VisitHistoryBusinessIcon>;
  /** Org users from GET /user (must include branchUid/branch for picker subtitles). */
  usersList: UserListItem[];
  visitsSummaryDisabled: boolean;
  onOpenVisitsSummary: () => void;
  /** Enables branch labels in the user combobox when organization branches are available. */
  branches?: BranchListItem[];
  /** When false, hides the visits summary (grid) button — e.g. if parent has no modal. */
  showVisitsSummaryButton?: boolean;
  /** When false, hides the table/map toggle (e.g. Reports Visualiser is map-only). Default true. */
  showMapTableToggle?: boolean;
  /** Optional section heading above the toolbar. Default: none. */
  sectionHeading?: ReactNode | null;
  /** When false, hides the user filter (e.g. self-scoped Reports visualiser). Default true. */
  showUserFilter?: boolean;
}

function VisitMapTableToggleButton() {
  const viewMode = useVisitsStore((s) => s.viewMode);
  const setViewMode = useVisitsStore((s) => s.setViewMode);
  return (
    <Button
      variant={viewMode === 'map' ? 'default' : 'outline'}
      size="sm"
      className="h-9 shrink-0 gap-1.5 border-gray-200 bg-white text-foreground"
      onClick={() => setViewMode(viewMode === 'map' ? 'table' : 'map')}
    >
      {viewMode === 'map' ? (
        <>
          <List className="size-4" />
          View table
        </>
      ) : (
        <>
          <MapIcon className="size-4" />
          Visualiser
        </>
      )}
    </Button>
  );
}

interface VisitDateRangePickerProps {
  layout: 'row' | 'stack';
}

function VisitDateRangePicker({ layout }: VisitDateRangePickerProps) {
  const {
    startDate,
    endDate,
    useAllTime,
    dateRangePopoverOpen,
    setDateRangePopoverOpen,
    setStartDate,
    setEndDate,
    resetDateRangeToDefault,
    setUseAllTime,
  } = useVisitsStore();

  const [draft, setDraft] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });
  const skipApplyOnCloseRef = useRef(false);

  const handleDatePopoverOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        skipApplyOnCloseRef.current = false;
        setDraft({ from: startDate, to: endDate });
        setDateRangePopoverOpen(true);
        return;
      }
      if (!skipApplyOnCloseRef.current && !useAllTime) {
        const from = draft?.from ?? startDate;
        const to = draft?.to ?? draft?.from ?? endDate;
        const ordered = orderUtcCalendarRange(from, to);
        setStartDate(ordered.start);
        setEndDate(ordered.end);
        setUseAllTime(false);
      }
      skipApplyOnCloseRef.current = false;
      setDateRangePopoverOpen(false);
    },
    [
      draft,
      useAllTime,
      startDate,
      endDate,
      setStartDate,
      setEndDate,
      setUseAllTime,
      setDateRangePopoverOpen,
    ]
  );

  const mtd = utcMonthStartThroughToday();
  const isDefaultRange =
    !useAllTime &&
    formatUtcYmd(startDate) === formatUtcYmd(mtd.start) &&
    formatUtcYmd(endDate) === formatUtcYmd(mtd.end);

  const rangeLabel = useAllTime
    ? 'All time'
    : formatUtcYmd(startDate) === formatUtcYmd(endDate)
      ? formatUtcCalendarLabel(startDate)
      : `${formatUtcCalendarLabel(startDate)} – ${formatUtcCalendarLabel(endDate)}`;

  const shortcutToday = useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const t = utcToday();
    setUseAllTime(false);
    setStartDate(t);
    setEndDate(t);
    setDateRangePopoverOpen(false);
  }, [setUseAllTime, setStartDate, setEndDate, setDateRangePopoverOpen]);

  const shortcutThisMonth = useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { start, end } = utcMonthStartThroughToday();
    setUseAllTime(false);
    setStartDate(start);
    setEndDate(end);
    setDateRangePopoverOpen(false);
  }, [setUseAllTime, setStartDate, setEndDate, setDateRangePopoverOpen]);

  const shortcutWholeMonth = useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { from, to } = getUtcMonthRange(utcToday());
    setUseAllTime(false);
    setStartDate(utcDateFromYmd(from));
    setEndDate(utcDateFromYmd(to));
    setDateRangePopoverOpen(false);
  }, [setUseAllTime, setStartDate, setEndDate, setDateRangePopoverOpen]);

  const triggerClass =
    layout === 'row'
      ? 'h-9 min-w-[220px] shrink-0 justify-start text-left font-normal sm:min-w-[260px]'
      : 'h-9 w-full min-w-0 justify-start text-left font-normal';

  return (
    <div className={cn('flex items-center gap-0', layout === 'stack' && 'w-full')}>
      <Popover open={dateRangePopoverOpen} onOpenChange={handleDatePopoverOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(reportsFilterSelectTriggerClass, triggerClass)}
          >
            <CalendarIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
            {rangeLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('w-[95vw] max-w-lg p-0 sm:w-auto', reportsFilterPortalHighZ)}
          align="center"
        >
          <div className="flex flex-col gap-3 border-b p-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={useAllTime ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseAllTime(true)}
              >
                All time
              </Button>
              <span className="text-xs text-muted-foreground">or pick a UTC range below</span>
            </div>
          </div>
          <Calendar
            mode="range"
            selected={draft}
            disabled={useAllTime}
            onSelect={(r) => {
              if (useAllTime) return;
              if (!r) {
                setDraft(undefined);
                return;
              }
              setUseAllTime(false);
              setDraft({
                from: r.from ? utcCalendarDateFromLocalPickerDate(r.from) : undefined,
                to: r.to ? utcCalendarDateFromLocalPickerDate(r.to) : undefined,
              });
            }}
            initialFocus
            numberOfMonths={2}
          />
          <div className="flex flex-wrap justify-between gap-2 border-t px-2 py-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={useAllTime}
                onClick={shortcutToday}
              >
                Today (UTC)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={useAllTime}
                onClick={shortcutThisMonth}
              >
                This month (UTC)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={useAllTime}
                onClick={shortcutWholeMonth}
              >
                Whole month (UTC)
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={useAllTime}
              className={cn(
                'border-transparent bg-violet-600 text-white shadow-sm',
                'hover:bg-violet-700 hover:text-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
                useAllTime && 'pointer-events-none opacity-50'
              )}
              onClick={() => handleDatePopoverOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {useAllTime || !isDefaultRange ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            resetDateRangeToDefault();
          }}
          className="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Reset to default range"
        >
          <XIcon className="size-4 text-muted-foreground" />
        </button>
      ) : null}
    </div>
  );
}

interface VisitFilterControlsProps {
  layout: 'row' | 'stack';
  uniqueRegions: string[];
  uniqueBusinessTypes: string[];
  businessTypeLabelMap: Map<string, string>;
  businessTypeIconMap: Map<string, VisitHistoryBusinessIcon>;
  usersList: UserListItem[];
  branches: BranchListItem[];
  showUserFilter: boolean;
}

function VisitFilterControls({
  layout,
  uniqueRegions,
  uniqueBusinessTypes,
  businessTypeLabelMap,
  businessTypeIconMap,
  usersList,
  branches,
  showUserFilter,
}: VisitFilterControlsProps) {
  const { selectedRegion, selectedBusinessType, selectedUserUid, setSelectedRegion, setSelectedBusinessType, setSelectedUserUid } =
    useVisitsStore();

  const row = layout === 'row';
  const pickerTriggerClass = row
    ? 'h-9 min-w-[140px] shrink-0 sm:w-[200px]'
    : 'h-9 w-full min-w-0';

  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  const regionPickerOptions = useMemo<SearchableOptionRow[]>(
    () =>
      uniqueRegions.map((region) => ({
        value: region,
        label: region,
        icon: <MapPinIcon className="size-4 shrink-0" />,
      })),
    [uniqueRegions]
  );

  const businessPickerOptions = useMemo<SearchableOptionRow[]>(
    () =>
      uniqueBusinessTypes.map((bt) => {
        const label = bt === 'Not set' ? 'Not set' : businessTypeLabelMap.get(bt) ?? bt;
        const IconComponent = businessTypeIconMap.get(bt) ?? MoreHorizontal;
        return {
          value: bt,
          label,
          icon: <IconComponent className="size-4 shrink-0" size={16} />,
          searchExtra: bt,
        };
      }),
    [uniqueBusinessTypes, businessTypeLabelMap, businessTypeIconMap]
  );

  return (
    <div className={wrapClass}>
      <VisitDateRangePicker layout={layout} />
      <SearchableOptionListPicker
        selectedValue={selectedRegion || 'all'}
        onValueChange={(v) => setSelectedRegion(v === 'all' ? '' : v)}
        options={regionPickerOptions}
        placeholderLabelWhenAll="All regions"
        searchPlaceholder="Search regions…"
        emptyMessage="No region found."
        triggerIcon={<MapPinIcon className="size-4 shrink-0" />}
        triggerClassName={pickerTriggerClass}
      />
      <SearchableOptionListPicker
        selectedValue={selectedBusinessType || 'all'}
        onValueChange={(v) => setSelectedBusinessType(v === 'all' ? '' : v)}
        options={businessPickerOptions}
        placeholderLabelWhenAll="All business types"
        searchPlaceholder="Search business types…"
        emptyMessage="No business type found."
        triggerIcon={<BriefcaseIcon className="size-4 shrink-0" />}
        triggerClassName={pickerTriggerClass}
      />
      {showUserFilter ? (
        <SearchableUserPicker
          users={usersList}
          branches={branches}
          selectedUid={selectedUserUid || 'all'}
          onUidChange={(v) => setSelectedUserUid(v === 'all' ? '' : v)}
          triggerClassName={cn(pickerTriggerClass, 'justify-between gap-2')}
          searchPlaceholder="Search users…"
        />
      ) : null}
    </div>
  );
}

/**
 * Shared filter bar for Visit History: date range, region, business type, user, search, table/map toggle.
 */
export function VisitHistoryToolbar({
  uniqueRegions,
  uniqueBusinessTypes,
  businessTypeLabelMap,
  businessTypeIconMap,
  usersList,
  visitsSummaryDisabled,
  onOpenVisitsSummary,
  branches = [],
  showVisitsSummaryButton = true,
  showMapTableToggle = true,
  sectionHeading = null,
  showUserFilter = true,
}: VisitHistoryToolbarProps) {
  const {
    searchQuery,
    setSearchQuery,
    resetDateRangeToDefault,
    setSelectedRegion,
    setSelectedBusinessType,
    setSelectedUserUid,
  } = useVisitsStore();

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

  function resetAll() {
    resetDateRangeToDefault();
    setSelectedRegion('');
    setSelectedBusinessType('');
    setSelectedUserUid('');
    setSearchQuery('');
  }

  function renderSearchField(className?: string) {
    return (
      <div className={cn('relative w-full min-w-0 shrink-0 md:w-56 md:max-w-[16rem]', className)}>
        <Input
          placeholder="Search visits…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(filterToolbarSearchInputClassName, searchQuery && 'pr-8')}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }

  const actionButtons = (
    <>
      {showMapTableToggle ? <VisitMapTableToggleButton /> : null}
      {showVisitsSummaryButton ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 shrink-0 border-gray-200 bg-white p-0 text-foreground"
              onClick={onOpenVisitsSummary}
              disabled={visitsSummaryDisabled}
              aria-label="View visits summary"
            >
              <Table2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View visits summary</TooltipContent>
        </Tooltip>
      ) : null}
    </>
  );

  const filterProps: VisitFilterControlsProps = {
    layout: 'row',
    uniqueRegions,
    uniqueBusinessTypes,
    businessTypeLabelMap,
    businessTypeIconMap,
    usersList,
    branches,
    showUserFilter,
  };

  return (
    <>
      {sectionHeading}
      <div className="mb-4 flex shrink-0 flex-col gap-3" data-tour="visits-toolbar">
        <div className="flex flex-col gap-2 md:hidden">
          <div className="flex w-full min-w-0 flex-row items-stretch gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(selectTriggerClass, 'h-9 min-w-0 flex-1 justify-center gap-2')}
              onClick={() => setFiltersDialogOpen(true)}
            >
              <Filter className="size-4 shrink-0" aria-hidden />
              Filter
            </Button>
            <div className="flex shrink-0 items-center gap-2">{actionButtons}</div>
          </div>
          {renderSearchField('w-full')}
        </div>

        <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Filters</DialogTitle>
              <DialogDescription>
                Date range, region, business type, and user for visit history.
              </DialogDescription>
            </DialogHeader>
            <VisitFilterControls {...filterProps} layout="stack" />
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full"
                onClick={() => {
                  resetAll();
                  setFiltersDialogOpen(false);
                }}
              >
                Reset filters
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="hidden w-full min-w-0 items-center gap-3 md:flex">
          <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
              <VisitFilterControls {...filterProps} layout="row" />
            </div>
          </div>
          <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-2">
            {renderSearchField()}
            {actionButtons}
          </div>
        </div>
      </div>
    </>
  );
}
