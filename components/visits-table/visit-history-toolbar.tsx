'use client';

import type { ComponentType, ReactNode } from 'react';
import { useMemo, useRef, useState, useCallback } from 'react';
import type { DateRange } from 'react-day-picker';
import { Map as MapIcon, List, Table2, MoreHorizontal, CalendarIcon } from 'lucide-react';
import type { BranchListItem } from '@/api/types/branch';
import type { ReportsFilterUserPickable } from '@/app/reports/components/reports-searchable-filter-comboboxes';
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

export interface VisitHistoryUserRow {
  uid: number;
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  photoURL?: string | null;
  avatar?: string | null;
}

/** Matches icons used in `TYPE_OF_BUSINESS_OPTIONS` (lucide + class components). */
export type VisitHistoryBusinessIcon = ComponentType<{ className?: string; size?: number }>;

export interface VisitHistoryToolbarProps {
  uniqueRegions: string[];
  uniqueBusinessTypes: string[];
  businessTypeLabelMap: Map<string, string>;
  businessTypeIconMap: Map<string, VisitHistoryBusinessIcon>;
  usersList: VisitHistoryUserRow[];
  visitsSummaryDisabled: boolean;
  onOpenVisitsSummary: () => void;
  /** Enables branch labels in the user combobox when organization branches are available. */
  branches?: BranchListItem[];
  /** When false, hides the visits summary (grid) button — e.g. if parent has no modal. */
  showVisitsSummaryButton?: boolean;
  /** When false, hides the table/map toggle (e.g. Reports Visualiser is map-only). Default true. */
  showMapTableToggle?: boolean;
  /** Default: visible "Visit history" heading. Pass null to omit. */
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
      className="h-9 bg-white border-gray-200 text-foreground gap-1.5 shrink-0"
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

function userRowToPickable(u: VisitHistoryUserRow): ReportsFilterUserPickable {
  return {
    uid: u.uid,
    name: u.name ?? '',
    surname: u.surname ?? '',
    email: u.email ?? '',
    photoURL: u.photoURL,
    avatar: u.avatar,
  };
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
  sectionHeading,
  showUserFilter = true,
}: VisitHistoryToolbarProps) {
  const {
    startDate,
    endDate,
    useAllTime,
    selectedRegion,
    selectedBusinessType,
    selectedUserUid,
    searchQuery,
    dateRangePopoverOpen,
    setDateRangePopoverOpen,
    setStartDate,
    setEndDate,
    resetDateRangeToDefault,
    setUseAllTime,
    setSelectedRegion,
    setSelectedBusinessType,
    setSelectedUserUid,
    setSearchQuery,
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

  const pickerUsers = useMemo(
    () => usersList.map(userRowToPickable),
    [usersList]
  );

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
        const label =
          bt === 'Not set' ? 'Not set' : businessTypeLabelMap.get(bt) ?? bt;
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

  const heading =
    sectionHeading === undefined ? (
      <h2 className="mb-4 text-base font-medium text-foreground sm:text-lg">Visit history</h2>
    ) : (
      sectionHeading
    );

  const pickerTriggerClass =
    'h-9 w-full min-w-[140px] shrink-0 sm:w-[200px]';

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

  return (
    <>
      {heading}
      <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-0">
            <Popover
              open={dateRangePopoverOpen}
              onOpenChange={handleDatePopoverOpenChange}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    reportsFilterSelectTriggerClass,
                    'h-9 min-w-[220px] shrink-0 justify-start text-left font-normal sm:min-w-[260px]'
                  )}
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
                    <span className="text-xs text-muted-foreground">
                      or pick a UTC range below
                    </span>
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
                      from: r.from
                        ? utcCalendarDateFromLocalPickerDate(r.from)
                        : undefined,
                      to: r.to
                        ? utcCalendarDateFromLocalPickerDate(r.to)
                        : undefined,
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
                      'bg-violet-600 text-white shadow-sm border-transparent',
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
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  resetDateRangeToDefault();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    resetDateRangeToDefault();
                  }
                }}
                className="ml-0.5 shrink-0 cursor-pointer rounded p-0.5 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Reset to default range"
              >
                <XIcon className="size-4 text-red-600" />
              </span>
            ) : null}
          </div>

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
              users={pickerUsers}
              branches={branches}
              selectedUid={selectedUserUid || 'all'}
              onUidChange={(v) => setSelectedUserUid(v === 'all' ? '' : v)}
              showBranchSubtitle={branches.length > 0}
              triggerClassName={`${pickerTriggerClass} justify-between gap-2`}
              searchPlaceholder="Search users…"
            />
          ) : null}
        </div>
        <div className="flex w-full flex-nowrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 shrink basis-full sm:w-64 sm:basis-auto">
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
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-600"
                aria-label="Clear search"
              >
                <XIcon className="size-4 text-red-600" />
              </button>
            ) : null}
          </div>
          {showMapTableToggle ? <VisitMapTableToggleButton /> : null}
          {showVisitsSummaryButton ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 bg-white border-gray-200 text-foreground shrink-0"
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
        </div>
      </div>
    </>
  );
}
