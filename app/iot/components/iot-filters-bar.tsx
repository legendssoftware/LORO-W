'use client';

import * as React from 'react';
import {
  Activity,
  Boxes,
  ChevronsUpDown,
  Check,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  SearchableBranchPicker,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
} from '@/app/reports/components/reports-searchable-filter-comboboxes';
import { XIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { BranchListItem } from '@/api/types/branch';
import { getBranchDisplayLabel } from '@/api/types/branch';
import type { DeviceStatus, DeviceType } from '@/api/types/iot';

export const IOT_FILTER_ALL = '__all__';

const DEVICE_STATUSES: DeviceStatus[] = [
  'online',
  'offline',
  'maintenance',
  'disconnected',
];

const DEVICE_TYPES: DeviceType[] = [
  'door_sensor',
  'camera',
  'sensor',
  'actuator',
  'controller',
  'gateway',
  'rfid',
  'nfc',
  'barcode',
  'beacon',
  'other',
];

function humanEnumLabel(raw: string) {
  return raw.replace(/_/g, ' ');
}

function IotToolbarEnumPicker({
  Icon,
  allLabel,
  searchPlaceholder,
  emptyMessage,
  triggerWidthClass,
  selected,
  allSentinel,
  options,
  onChange,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  allLabel: string;
  searchPlaceholder: string;
  emptyMessage: string;
  triggerWidthClass: string;
  selected: string;
  allSentinel: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerText =
    selected === allSentinel ? allLabel : humanEnumLabel(selected);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            reportsFilterSelectTriggerClass,
            'justify-between font-normal',
            triggerWidthClass
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate capitalize">{triggerText}</span>
          </span>
          <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-[220px] max-w-[min(100vw-2rem,28rem)] p-0',
          reportsFilterPortalHighZ
        )}
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={`${allLabel} ${allSentinel}`}
                onSelect={() => {
                  onChange(allSentinel);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'size-4 shrink-0',
                    selected === allSentinel ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="truncate">{allLabel}</span>
              </CommandItem>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={`${humanEnumLabel(opt)} ${opt}`}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'size-4 shrink-0',
                      selected === opt ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate capitalize">
                    {humanEnumLabel(opt)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export interface IotFiltersBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: typeof IOT_FILTER_ALL | DeviceStatus;
  onStatusFilterChange: (v: typeof IOT_FILTER_ALL | DeviceStatus) => void;
  typeFilter: typeof IOT_FILTER_ALL | DeviceType;
  onTypeFilterChange: (v: typeof IOT_FILTER_ALL | DeviceType) => void;
  branchUidFilter: typeof IOT_FILTER_ALL | string;
  onBranchUidFilterChange: (v: typeof IOT_FILTER_ALL | string) => void;
  branches: BranchListItem[];
  onAddDevice: () => void;
}

export function IotFiltersBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  branchUidFilter,
  onBranchUidFilterChange,
  branches,
  onAddDevice,
}: IotFiltersBarProps) {
  function renderSearchField() {
    return (
      <div className="relative w-full min-w-0 shrink-0 md:w-56 md:max-w-[16rem]">
        <Input
          placeholder="Search ID, tag, or location"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(filterToolbarSearchInputClassName, search && 'pr-8')}
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }

  const branchRows = React.useMemo(() => {
    return [...branches].sort((a, b) =>
      getBranchDisplayLabel(a).localeCompare(getBranchDisplayLabel(b))
    );
  }, [branches]);

  return (
    <div className="flex flex-col gap-3 shrink-0 mb-4">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center min-w-0 flex-1">
          <IotToolbarEnumPicker
            Icon={Activity}
            allLabel="All statuses"
            searchPlaceholder="Search statuses…"
            emptyMessage="No status found."
            triggerWidthClass="h-9 w-full sm:w-[160px]"
            selected={statusFilter}
            allSentinel={IOT_FILTER_ALL}
            options={DEVICE_STATUSES}
            onChange={(v) =>
              onStatusFilterChange(v as typeof IOT_FILTER_ALL | DeviceStatus)
            }
          />

          <IotToolbarEnumPicker
            Icon={Boxes}
            allLabel="All types"
            searchPlaceholder="Search types…"
            emptyMessage="No type found."
            triggerWidthClass="h-9 w-full sm:w-[180px]"
            selected={typeFilter}
            allSentinel={IOT_FILTER_ALL}
            options={DEVICE_TYPES}
            onChange={(v) =>
              onTypeFilterChange(v as typeof IOT_FILTER_ALL | DeviceType)
            }
          />

          <SearchableBranchPicker
            branches={branchRows}
            selectedBranchId={
              branchUidFilter === IOT_FILTER_ALL ? 'all' : branchUidFilter
            }
            onBranchChange={(id) =>
              onBranchUidFilterChange(id === 'all' ? IOT_FILTER_ALL : id)
            }
            triggerClassName="h-9 w-full sm:w-[200px]"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center shrink-0">
          {renderSearchField()}
          <Button
            type="button"
            className={cn(
              'h-9 shrink-0 gap-2 border-0 px-4 !rounded',
              'bg-violet-600 text-white hover:bg-violet-700',
              'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
              '[&_svg]:text-white'
            )}
            onClick={onAddDevice}
          >
            <Plus className="size-4" aria-hidden />
            Add device
          </Button>
        </div>
      </div>
    </div>
  );
}
