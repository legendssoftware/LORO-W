'use client';

import * as React from 'react';
import { CalendarIcon, ChevronsUpDown, Filter, LayoutGrid, Truck } from 'lucide-react';
import { DELIVERY_STATUSES, type DriverOption } from '@/api/types/epod';
import { formatDeliveryStatus } from '@/app/deliveries/format';
import {
  SearchableOptionListPicker,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
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
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { XIcon } from '@/lib/icons';
import {
  defaultDateRange,
  formatIsoToDisplay,
  maskDisplayDate,
  parseFlexibleDate,
  toIsoDateString,
} from '@/lib/user-form/date-input';
import { cn } from '@/lib/utils';

const ANY_VALUE = 'all';
const selectTriggerClass = 'h-9 w-full border-border bg-background text-foreground sm:w-auto';

function FilterClearButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
      aria-label={label}
    >
      <XIcon className="size-4 text-muted-foreground" />
    </button>
  );
}

function DeliveryDayPicker({
  value,
  onChange,
  layout,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  layout: 'row' | 'stack';
}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(() => formatIsoToDisplay(value));
  const selected = parseFlexibleDate(value ?? '') ?? undefined;
  const range = defaultDateRange();
  const defaultMonth = selected ?? range.defaultMonth;
  const row = layout === 'row';
  const triggerClass = row ? 'h-9 min-w-0 w-[160px] shrink-0' : 'h-9 w-full min-w-0';
  const triggerLabel = formatIsoToDisplay(value) || 'All days';

  React.useEffect(() => {
    setText(formatIsoToDisplay(value));
  }, [value]);

  function commitText(raw: string) {
    const next = maskDisplayDate(raw);
    setText(next);
    if (!next.trim()) {
      onChange(null);
      return;
    }
    const parsed = parseFlexibleDate(next);
    if (parsed) onChange(toIsoDateString(parsed));
  }

  function handleBlur() {
    if (!text.trim()) {
      onChange(null);
      return;
    }
    const parsed = parseFlexibleDate(text);
    if (parsed) {
      onChange(toIsoDateString(parsed));
      setText(formatIsoToDisplay(toIsoDateString(parsed)));
      return;
    }
    setText(formatIsoToDisplay(value));
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-1', !row && 'w-full')}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Delivery day"
            title={triggerLabel}
            className={cn(
              reportsFilterSelectTriggerClass,
              'justify-between font-normal',
              triggerClass,
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{triggerLabel}</span>
            </span>
            <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('w-auto space-y-3 p-3', reportsFilterPortalHighZ)}
          align="start"
        >
          <Input
            id="delivery-date"
            value={text}
            onChange={(event) => commitText(event.target.value)}
            onBlur={handleBlur}
            placeholder="DD/MM/YYYY"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Delivery day"
            className="h-9"
          />
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={defaultMonth}
            startMonth={range.startMonth}
            endMonth={range.endMonth}
            onSelect={(date) => {
              onChange(date ? toIsoDateString(date) : null);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {value ? <FilterClearButton label="Clear day" onClick={() => onChange(null)} /> : null}
    </div>
  );
}

export interface DeliveriesFilterControlsProps {
  layout: 'row' | 'stack';
  date: string | null;
  onDateChange: (value: string | null) => void;
  status: string;
  onStatusChange: (value: string) => void;
  showDriverFilter: boolean;
  driverUid: string;
  onDriverUidChange: (value: string) => void;
  drivers: DriverOption[];
}

export function DeliveriesFilterControls({
  layout,
  date,
  onDateChange,
  status,
  onStatusChange,
  showDriverFilter,
  driverUid,
  onDriverUidChange,
  drivers,
}: DeliveriesFilterControlsProps) {
  const row = layout === 'row';
  const chipTrigger = row ? 'h-9 min-w-0 w-[160px] shrink-0' : 'h-9 w-full min-w-0';
  const driverTrigger = row ? 'h-9 min-w-0 w-[180px] shrink-0' : 'h-9 w-full min-w-0';

  const statusOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      DELIVERY_STATUSES.map((option) => ({
        value: option,
        label: formatDeliveryStatus(option),
        icon: <LayoutGrid className="size-4 shrink-0" />,
      })),
    [],
  );

  const driverOptions = React.useMemo<SearchableOptionRow[]>(
    () =>
      drivers.map((driver) => ({
        value: String(driver.uid),
        label: `${driver.name} ${driver.surname}`.trim(),
        icon: <Truck className="size-4 shrink-0" />,
      })),
    [drivers],
  );

  return (
    <div className={row ? 'flex flex-nowrap items-center gap-2' : 'flex w-full flex-col gap-4'}>
      <DeliveryDayPicker value={date} onChange={onDateChange} layout={layout} />

      <div className={cn('flex min-w-0 items-center gap-1', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={status}
          onValueChange={onStatusChange}
          options={statusOptions}
          placeholderLabelWhenAll="All statuses"
          searchPlaceholder="Search status…"
          emptyMessage="No status found."
          triggerIcon={<LayoutGrid className="size-4 shrink-0" />}
          triggerClassName={chipTrigger}
        />
        {status !== ANY_VALUE ? (
          <FilterClearButton label="Clear status filter" onClick={() => onStatusChange(ANY_VALUE)} />
        ) : null}
      </div>

      {showDriverFilter ? (
        <div className={cn('flex min-w-0 items-center gap-1', !row && 'w-full')}>
          <SearchableOptionListPicker
            selectedValue={driverUid}
            onValueChange={onDriverUidChange}
            options={driverOptions}
            placeholderLabelWhenAll="All drivers"
            searchPlaceholder="Search drivers…"
            emptyMessage="No driver found."
            triggerIcon={<Truck className="size-4 shrink-0" />}
            triggerClassName={driverTrigger}
          />
          {driverUid !== ANY_VALUE ? (
            <FilterClearButton
              label="Clear driver filter"
              onClick={() => onDriverUidChange(ANY_VALUE)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export interface DeliveriesFiltersBarProps extends Omit<DeliveriesFilterControlsProps, 'layout'> {
  search: string;
  onSearchChange: (value: string) => void;
  actions?: React.ReactNode;
}

export function DeliveriesFiltersBar({
  search,
  onSearchChange,
  actions,
  ...filterProps
}: DeliveriesFiltersBarProps) {
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
          placeholder="Search by invoice no."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search by invoice number"
          className={cn(filterToolbarSearchInputClassName, search && 'pr-8')}
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3">
      <div className="flex flex-col gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          className={cn(selectTriggerClass, 'h-9 w-full min-w-0 justify-center')}
          onClick={() => setFiltersDialogOpen(true)}
        >
          <Filter className="mr-2 size-4 shrink-0" aria-hidden />
          Filter
        </Button>
        <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {renderSearchField()}
          {actions}
        </div>
      </div>

      <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>Narrow deliveries by day, status, and driver.</DialogDescription>
          </DialogHeader>
          <DeliveriesFilterControls {...filterProps} layout="stack" />
        </DialogContent>
      </Dialog>

      <div className="hidden w-full min-w-0 items-center justify-between gap-3 md:flex">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full flex-nowrap items-center gap-2">
            <DeliveriesFilterControls {...filterProps} layout="row" />
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
