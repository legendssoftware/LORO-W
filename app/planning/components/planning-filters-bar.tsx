'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { DateRange } from 'react-day-picker';
import { CalendarDays, CalendarIcon, Clock, Filter, LayoutGrid } from 'lucide-react';
import type { UserListItem } from '@/api/endpoints/user';
import type { ClientListItem } from '@/api/types/clients';
import type { BranchListItem } from '@/api/types/branch';
import {
  SearchableOptionListPicker,
  SearchableUserPicker,
  reportsFilterSelectTriggerClass,
  reportsFilterPortalHighZ,
} from '@/components/filters/searchable-filter-comboboxes';
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
import { StoreIcon, XIcon } from '@/lib/icons';
import {
  formatUtcCalendarLabel,
  formatUtcYmd,
  getUtcMonthRange,
  localPickerDateFromUtcCalendarDate,
  localPickerRangeFromUtcCalendarRange,
  orderUtcCalendarRange,
  utcCalendarDateFromLocalPickerDate,
  utcDateFromYmd,
  utcMonthStartThroughToday,
  utcPlanningDefaultRange,
  utcToday,
} from '@/lib/utils/overview-daily-summary';
import {
  TASK_STATUS_OPTIONS_WITH_ALL,
  TASK_PRIORITY_OPTIONS_WITH_ALL,
} from '@/lib/task-form-utils';
import { cn } from '@/lib/utils';
import { statusFilterIconClass } from '@/lib/status-filter-icon';

const TASK_STATUS_LABEL_KEYS: Record<(typeof TASK_STATUS_OPTIONS_WITH_ALL)[number]['value'], string> = {
  all: 'actions.allStatuses',
  PENDING: 'chrome.planning.status.pending',
  IN_PROGRESS: 'chrome.planning.status.inProgress',
  COMPLETED: 'chrome.planning.status.completed',
  CANCELLED: 'chrome.planning.status.cancelled',
  OVERDUE: 'chrome.planning.status.overdue',
  POSTPONED: 'chrome.planning.status.postponed',
  MISSED: 'chrome.planning.status.missed',
};

const TASK_PRIORITY_LABEL_KEYS: Record<(typeof TASK_PRIORITY_OPTIONS_WITH_ALL)[number]['value'], string> = {
  all: 'chrome.planning.allPriorities',
  LOW: 'chrome.planning.priority.low',
  MEDIUM: 'chrome.planning.priority.medium',
  HIGH: 'chrome.planning.priority.high',
  URGENT: 'chrome.planning.priority.urgent',
};

const selectTriggerClass =
  'h-9 border-border bg-background text-foreground sm:w-auto';

export interface PlanningFilterControlsProps {
  layout: 'row' | 'stack';
  users: UserListItem[];
  branches: BranchListItem[];
  clientsList: ClientListItem[];
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  selectedStatus: string;
  selectedPriority: string;
  selectedAssigneeId: string;
  selectedClientId: string;
  filterOverdueOnly: boolean;
  dateRangePopoverOpen: boolean;
  onDateRangePopoverOpenChange: (open: boolean) => void;
  onSetUseAllTime: (v: boolean) => void;
  /** Commit ordered UTC calendar-day range; caller should clear All time. */
  onRangeChange: (start: Date, end: Date) => void;
  onResetDateRange: () => void;
  onSelectedStatusChange: (v: string) => void;
  onSelectedPriorityChange: (v: string) => void;
  onFilterOverdueChange: (overdue: boolean) => void;
  onSelectedClientIdChange: (v: string) => void;
  onSelectedAssigneeIdChange: (v: string) => void;
  /** Controlled assignee-picker search (server-backed when parent wires useSearchableUsersList). */
  userSearchQuery?: string;
  onUserSearchQueryChange?: (query: string) => void;
  isUserSearchLoading?: boolean;
}

export function PlanningFilterControls({
  layout,
  users,
  branches,
  clientsList,
  startDate,
  endDate,
  useAllTime,
  selectedStatus,
  selectedPriority,
  selectedAssigneeId,
  selectedClientId,
  filterOverdueOnly,
  dateRangePopoverOpen,
  onDateRangePopoverOpenChange,
  onSetUseAllTime,
  onRangeChange,
  onResetDateRange,
  onSelectedStatusChange,
  onSelectedPriorityChange,
  onFilterOverdueChange,
  onSelectedClientIdChange,
  onSelectedAssigneeIdChange,
  userSearchQuery,
  onUserSearchQueryChange,
  isUserSearchLoading = false,
}: PlanningFilterControlsProps) {
  const { t } = useTranslation('screens');
  const row = layout === 'row';
  const rangeBtnWidth = row
    ? 'h-9 min-w-[220px] shrink-0 justify-start text-left font-normal sm:min-w-[260px]'
    : 'h-9 w-full shrink-0 justify-start text-left font-normal';

  const defaultRange = utcPlanningDefaultRange();
  const isDefaultRange =
    !useAllTime &&
    formatUtcYmd(startDate) === formatUtcYmd(defaultRange.start) &&
    formatUtcYmd(endDate) === formatUtcYmd(defaultRange.end);

  const categoricalWidth = row
    ? cn(reportsFilterSelectTriggerClass, 'min-w-[150px] w-[176px] shrink-0')
    : cn(reportsFilterSelectTriggerClass, 'w-full');
  const userWidth = row
    ? cn(reportsFilterSelectTriggerClass, 'min-w-[180px] w-[210px] shrink-0 sm:min-w-[200px] sm:w-[220px]')
    : cn(reportsFilterSelectTriggerClass, 'w-full');
  const wrapClass = row
    ? 'flex flex-nowrap items-center gap-2'
    : 'flex w-full flex-col gap-4';

  const [draft, setDraft] = React.useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });

  const skipApplyOnCloseRef = React.useRef(false);

  function handlePopoverOpenChange(open: boolean) {
    if (open) {
      skipApplyOnCloseRef.current = false;
      setDraft({ from: startDate, to: endDate });
      onDateRangePopoverOpenChange(true);
      return;
    }
    if (!skipApplyOnCloseRef.current && !useAllTime) {
      const from = draft?.from ?? startDate;
      const to = draft?.to ?? draft?.from ?? endDate;
      const { start, end } = orderUtcCalendarRange(from, to);
      onRangeChange(start, end);
    }
    skipApplyOnCloseRef.current = false;
    onDateRangePopoverOpenChange(false);
  }

  const rangeLabel = useAllTime
    ? t('actions.allTime')
    : formatUtcYmd(startDate) === formatUtcYmd(endDate)
      ? formatUtcCalendarLabel(startDate)
      : `${formatUtcCalendarLabel(startDate)} – ${formatUtcCalendarLabel(endDate)}`;

  const handleShortcutToday = React.useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const today = utcToday();
    onSetUseAllTime(false);
    onRangeChange(today, today);
    onDateRangePopoverOpenChange(false);
  }, [onDateRangePopoverOpenChange, onRangeChange, onSetUseAllTime]);

  const handleShortcutThisMonth = React.useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { start, end } = utcMonthStartThroughToday();
    onSetUseAllTime(false);
    onRangeChange(start, end);
    onDateRangePopoverOpenChange(false);
  }, [onDateRangePopoverOpenChange, onRangeChange, onSetUseAllTime]);

  const handleShortcutWholeMonth = React.useCallback(() => {
    skipApplyOnCloseRef.current = true;
    const { from, to } = getUtcMonthRange(utcToday());
    onSetUseAllTime(false);
    onRangeChange(utcDateFromYmd(from), utcDateFromYmd(to));
    onDateRangePopoverOpenChange(false);
  }, [onDateRangePopoverOpenChange, onRangeChange, onSetUseAllTime]);

  const statusOptions = TASK_STATUS_OPTIONS_WITH_ALL.map((opt) => {
    const label = t(TASK_STATUS_LABEL_KEYS[opt.value]);
    return {
      value: opt.value,
      label,
      icon: (
        <opt.icon className={cn('size-4 shrink-0', statusFilterIconClass(opt.value))} />
      ),
      searchExtra: `${label} ${opt.label}`,
    };
  });

  const priorityOptions = TASK_PRIORITY_OPTIONS_WITH_ALL.map((opt) => {
    const label = t(TASK_PRIORITY_LABEL_KEYS[opt.value]);
    return {
      value: opt.value,
      label,
      icon: <opt.icon className="size-4 shrink-0" />,
      searchExtra: `${label} ${opt.label}`,
    };
  });

  const deadlineOptions = React.useMemo(
    () => [
      {
        value: 'all',
        label: t('chrome.planning.allDeadlines'),
        icon: (
          <Clock className="size-4 shrink-0 text-muted-foreground" />
        ),
        searchExtra: 'deadline due',
      },
      {
        value: 'overdue',
        label: t('chrome.planning.overdueOnly'),
        icon: (
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        ),
        searchExtra: 'overdue late',
      },
    ],
    [t]
  );

  const clientOptions = React.useMemo(
    () =>
      clientsList.map((c) => ({
        value: String(c.uid),
        label: c.name,
        icon: (
          <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
        ),
        searchExtra: `${c.name} ${c.uid}`,
      })),
    [clientsList]
  );

  return (
    <div className={wrapClass}>
      <div className={cn('flex items-center gap-0', !row && 'w-full min-w-0')}>
        <Popover open={dateRangePopoverOpen} onOpenChange={handlePopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(rangeBtnWidth, reportsFilterSelectTriggerClass)}
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
                  onClick={() => {
                    onSetUseAllTime(true);
                    onDateRangePopoverOpenChange(false);
                  }}
                >
                  {t('actions.allTime')}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {t('actions.pickUtcRange')}
                </span>
              </div>
            </div>
            <Calendar
              mode="range"
              selected={localPickerRangeFromUtcCalendarRange(draft)}
              defaultMonth={localPickerDateFromUtcCalendarDate(draft?.from ?? startDate)}
              disabled={useAllTime}
              onSelect={(r) => {
                if (useAllTime) return;
                if (!r) {
                  setDraft(undefined);
                  return;
                }
                onSetUseAllTime(false);
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
              numberOfMonths={layout === 'stack' ? 1 : 2}
            />
            <div className="flex flex-wrap justify-between gap-2 border-t px-2 py-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={useAllTime}
                  onClick={handleShortcutToday}
                >
                  {t('actions.todayUtc')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={useAllTime}
                  onClick={handleShortcutThisMonth}
                >
                  {t('actions.thisMonthUtc')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={useAllTime}
                  onClick={handleShortcutWholeMonth}
                >
                  {t('actions.wholeMonthUtc')}
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
                onClick={() => handlePopoverOpenChange(false)}
              >
                {t('actions.done')}
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
              onResetDateRange();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onResetDateRange();
              }
            }}
            className="ml-0.5 shrink-0 cursor-pointer rounded p-0.5 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('actions.resetDefaultRange')}
          >
            <XIcon className="size-4 text-red-600" />
          </span>
        ) : null}
      </div>

      <SearchableOptionListPicker
        selectedValue={selectedStatus === '' ? 'all' : selectedStatus}
        onValueChange={onSelectedStatusChange}
        options={statusOptions}
        triggerClassName={categoricalWidth}
        placeholderLabelWhenAll={t('actions.allStatuses')}
        searchPlaceholder={t('chrome.planning.searchStatuses')}
        emptyMessage={t('actions.noStatusFound')}
        triggerIcon={<LayoutGrid className="size-4 shrink-0 text-muted-foreground" />}
      />

      <SearchableOptionListPicker
        selectedValue={selectedPriority === '' ? 'all' : selectedPriority}
        onValueChange={onSelectedPriorityChange}
        options={priorityOptions}
        triggerClassName={categoricalWidth}
        placeholderLabelWhenAll={t('chrome.planning.allPriorities')}
        searchPlaceholder={t('chrome.planning.searchPriorities')}
        emptyMessage={t('chrome.planning.noPriorityFound')}
        triggerIcon={<LayoutGrid className="size-4 shrink-0 text-muted-foreground" />}
      />

      <SearchableOptionListPicker
        selectedValue={filterOverdueOnly ? 'overdue' : 'all'}
        onValueChange={(v) => onFilterOverdueChange(v === 'overdue')}
        options={deadlineOptions}
        triggerClassName={categoricalWidth}
        placeholderLabelWhenAll={t('chrome.planning.allDeadlines')}
        searchPlaceholder={t('chrome.planning.searchDeadlines')}
        emptyMessage={t('chrome.planning.noOptionFound')}
        triggerIcon={<CalendarDays className="size-4 shrink-0 text-muted-foreground" />}
      />

      <SearchableOptionListPicker
        selectedValue={selectedClientId === '' ? 'all' : selectedClientId}
        onValueChange={(v) => onSelectedClientIdChange(v === 'all' ? '' : v)}
        options={clientOptions}
        triggerClassName={categoricalWidth}
        placeholderLabelWhenAll={t('chrome.planning.allClients')}
        searchPlaceholder={t('chrome.planning.searchClients')}
        emptyMessage={t('chrome.planning.noClientFound')}
        triggerIcon={<StoreIcon className="size-4 shrink-0 text-muted-foreground" />}
      />

      <SearchableUserPicker
        users={users}
        branches={branches}
        selectedUid={selectedAssigneeId === '' ? 'all' : selectedAssigneeId}
        onUidChange={(uid) =>
          onSelectedAssigneeIdChange(uid === 'all' ? '' : uid)
        }
        triggerClassName={userWidth}
        searchQuery={userSearchQuery}
        onSearchQueryChange={onUserSearchQueryChange}
        isSearchLoading={isUserSearchLoading}
      />
    </div>
  );
}

export interface PlanningFiltersBarProps
  extends Omit<PlanningFilterControlsProps, 'layout'> {
  searchInput: string;
  onSearchChange: (value: string) => void;
  actions?: React.ReactNode;
}

export function PlanningFiltersBar({
  searchInput,
  onSearchChange,
  actions,
  ...filterProps
}: PlanningFiltersBarProps) {
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
      <div className="relative min-w-0 flex-1 md:w-56 md:max-w-[16rem] md:flex-none">
        <Input
          placeholder={t('forms.planning.searchTasks')}
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(filterToolbarSearchInputClassName, searchInput && 'pr-8')}
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('actions.clearSearch')}
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3" data-tour="planning-toolbar">
      <div className="flex flex-col gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          className={cn(selectTriggerClass, 'h-9 w-full min-w-0 justify-center')}
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
              {t('chrome.planning.filtersDescription')}
            </DialogDescription>
          </DialogHeader>
          <PlanningFilterControls {...filterProps} layout="stack" />
        </DialogContent>
      </Dialog>

      <div className="hidden md:flex w-full min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <PlanningFilterControls {...filterProps} layout="row" />
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
