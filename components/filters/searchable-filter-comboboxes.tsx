'use client';

import * as React from 'react';
import {
  Building2,
  Check,
  ChevronsUpDown,
  MapPinned,
  User,
} from 'lucide-react';
import type { UserListItem } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import { getBranchDisplayLabel } from '@/api/hooks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { branchFlagAndLabel } from '@/lib/utils/branch-person-cell';
import { groupBranchesByProvince } from '@/app/reports/lib/reports-branch-geo';

export const reportsFilterSelectTriggerClass =
  'h-9 w-full border-border bg-background text-foreground sm:w-auto';

export const reportsFilterPortalHighZ = 'z-[10001]';

export const reportsDateRangePopoverContentClass =
  'w-[min(100vw-2rem,42rem)] max-w-full p-0 sm:w-auto';

export const reportsDateRangeCalendarProps = {
  numberOfMonths: 2,
  classNames: {
    months: 'flex flex-row gap-4 relative',
  },
} as const;

export type ReportsFilterUserPickable = Pick<
  UserListItem,
  'uid' | 'name' | 'surname' | 'email' | 'photoURL' | 'avatar'
> & {
  branch?: { uid: number; name?: string } | null;
  branchUid?: number | null;
  username?: string | null;
};

function userDisplayName(u: ReportsFilterUserPickable): string {
  return (
    [u.name, u.surname].filter(Boolean).join(' ').trim() ||
    u.email ||
    `User ${u.uid}`
  );
}

function userMatchesSearch(
  u: ReportsFilterUserPickable,
  query: string,
  branchLabel: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  const hay = [
    u.name,
    u.surname,
    userDisplayName(u),
    u.email,
    u.username,
    branchLabel,
    String(u.uid),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return tokens.every((token) => hay.includes(token));
}

export interface SearchableBranchPickerProps {
  branches: BranchListItem[];
  selectedBranchId: string;
  onBranchChange: (branchId: string) => void;
  triggerClassName?: string;
  searchPlaceholder?: string;
  /** When false, omit “All branches” (e.g. device form requires one branch). Default true. */
  withAllOption?: boolean;
  /** When `withAllOption` is false and no branch matches `selectedBranchId`. */
  emptySelectionLabel?: string;
  /** When true, list branches under province / region headings. */
  groupByProvince?: boolean;
}

function BranchPickerItems({
  branches,
  selectedBranchId,
  onBranchChange,
  onSelect,
}: {
  branches: BranchListItem[];
  selectedBranchId: string;
  onBranchChange: (branchId: string) => void;
  onSelect: () => void;
}) {
  return branches.map((b) => {
    const label = getBranchDisplayLabel(b);
    return (
      <CommandItem
        key={b.uid}
        value={`${label} ${b.uid}`}
        onSelect={() => {
          onBranchChange(String(b.uid));
          onSelect();
        }}
      >
        <Check
          className={cn(
            'size-4 shrink-0',
            selectedBranchId === String(b.uid) ? 'opacity-100' : 'opacity-0'
          )}
        />
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
          <MapPinned className="size-4 shrink-0 text-muted-foreground" />
          {label}
        </span>
      </CommandItem>
    );
  });
}

export function SearchableBranchPicker({
  branches,
  selectedBranchId,
  onBranchChange,
  triggerClassName,
  searchPlaceholder = 'Search branches…',
  withAllOption = true,
  emptySelectionLabel = 'Select branch',
  groupByProvince = false,
}: SearchableBranchPickerProps) {
  const [open, setOpen] = React.useState(false);

  const provinceGroups = React.useMemo(
    () => (groupByProvince ? groupBranchesByProvince(branches) : []),
    [branches, groupByProvince]
  );

  const triggerLabel = React.useMemo(() => {
    if (withAllOption && selectedBranchId === 'all') return 'All branches';
    const b = branches.find((x) => String(x.uid) === selectedBranchId);
    if (b) return getBranchDisplayLabel(b);
    return withAllOption ? 'All branches' : emptySelectionLabel;
  }, [
    selectedBranchId,
    branches,
    withAllOption,
    emptySelectionLabel,
  ]);

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
            triggerClassName
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{triggerLabel}</span>
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
            <CommandEmpty>No branch found.</CommandEmpty>
            {withAllOption ? (
              <CommandGroup>
                <CommandItem
                  value="all branches"
                  onSelect={() => {
                    onBranchChange('all');
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'size-4 shrink-0',
                      selectedBranchId === 'all' ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                    <MapPinned className="size-4 shrink-0 text-muted-foreground" />
                    All branches
                  </span>
                </CommandItem>
              </CommandGroup>
            ) : null}
            {groupByProvince ? (
              provinceGroups.map((group) => (
                <CommandGroup key={group.province} heading={group.province}>
                  {group.branches.map((b) => {
                    const label = getBranchDisplayLabel(b);
                    return (
                      <CommandItem
                        key={b.uid}
                        value={`${group.province} ${label} ${b.uid}`}
                        onSelect={() => {
                          onBranchChange(String(b.uid));
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'size-4 shrink-0',
                            selectedBranchId === String(b.uid)
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                          <MapPinned className="size-4 shrink-0 text-muted-foreground" />
                          {label}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))
            ) : (
              <CommandGroup>
                <BranchPickerItems
                  branches={branches}
                  selectedBranchId={selectedBranchId}
                  onBranchChange={onBranchChange}
                  onSelect={() => setOpen(false)}
                />
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export interface SearchableUserPickerProps {
  users: ReportsFilterUserPickable[];
  branches: BranchListItem[];
  selectedUid: string;
  onUidChange: (uid: string) => void;
  triggerClassName?: string;
  searchPlaceholder?: string;
  allOptionLabel?: string;
  emptyMessage?: string;
  /** When false, list rows omit branch flag/label (e.g. toolbar users without branch). */
  showBranchSubtitle?: boolean;
  /**
   * Controlled search text (e.g. for server-backed search).
   * When omitted, the picker keeps its own query state.
   */
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  /** Shown while a parent is fetching server search results. */
  isSearchLoading?: boolean;
}

export function SearchableUserPicker({
  users,
  branches,
  selectedUid,
  onUidChange,
  triggerClassName,
  searchPlaceholder = 'Search users…',
  allOptionLabel = 'All users',
  emptyMessage = 'No user found.',
  showBranchSubtitle = true,
  searchQuery: searchQueryProp,
  onSearchQueryChange,
  isSearchLoading = false,
}: SearchableUserPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internalQuery, setInternalQuery] = React.useState('');
  const isSearchControlled = searchQueryProp !== undefined;
  const query = isSearchControlled ? searchQueryProp : internalQuery;

  function setQuery(next: string) {
    if (!isSearchControlled) setInternalQuery(next);
    onSearchQueryChange?.(next);
  }

  const branchByUid = React.useMemo(
    () => new Map<number, BranchListItem>(branches.map((b) => [b.uid, b])),
    [branches]
  );

  const userTriggerLabel = React.useMemo(() => {
    if (selectedUid === 'all') return allOptionLabel;
    const u = users.find((x) => String(x.uid) === selectedUid);
    if (!u) return allOptionLabel;
    return userDisplayName(u);
  }, [selectedUid, users, allOptionLabel]);

  const selectedUserForTrigger = React.useMemo(
    () =>
      selectedUid === 'all' ? undefined : users.find((x) => String(x.uid) === selectedUid),
    [selectedUid, users]
  );

  const filteredUsers = React.useMemo(() => {
    // Parent owns server search for longer queries — don't double-filter the result set.
    if (onSearchQueryChange && query.trim().length >= 2) return users;
    return users.filter((u) => {
      const listUser = u as UserListItem;
      const { label: branchLabel } = showBranchSubtitle
        ? branchFlagAndLabel(listUser, branchByUid)
        : { label: '' };
      return userMatchesSearch(u, query, branchLabel);
    });
  }, [users, query, showBranchSubtitle, branchByUid, onSearchQueryChange]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            reportsFilterSelectTriggerClass,
            'justify-between font-normal',
            triggerClassName
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {selectedUserForTrigger ? (
              <>
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage
                    src={
                      selectedUserForTrigger.photoURL ??
                      selectedUserForTrigger.avatar ??
                      undefined
                    }
                    alt={userTriggerLabel}
                  />
                  <AvatarFallback className="text-[10px]">
                    {userTriggerLabel.trim().length > 0
                      ? userTriggerLabel.slice(0, 2).toUpperCase()
                      : '—'}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{userTriggerLabel}</span>
              </>
            ) : (
              <>
                <User className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{userTriggerLabel}</span>
              </>
            )}
          </span>
          <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[min(100vw-2rem,28rem)] p-0',
          reportsFilterPortalHighZ
        )}
        align="start"
        onOpenAutoFocus={(e) => {
          // Keep focus in the search input; map canvases often steal it otherwise.
          e.preventDefault();
          const input = (e.currentTarget as HTMLElement).querySelector<HTMLInputElement>(
            '[data-slot="command-input"]'
          );
          input?.focus();
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isSearchLoading ? 'Searching…' : emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={`${allOptionLabel} all`}
                onSelect={() => {
                  onUidChange('all');
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'size-4 shrink-0',
                    selectedUid === 'all' ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                  <User className="size-4 shrink-0 text-muted-foreground" />
                  {allOptionLabel}
                </span>
              </CommandItem>
              {filteredUsers.map((u) => {
                const displayName = userDisplayName(u);
                const listUser = u as UserListItem;
                const { flag: branchFlag, label: branchLabel } = showBranchSubtitle
                  ? branchFlagAndLabel(listUser, branchByUid)
                  : { flag: '', label: '' };
                const imgSrc = u.photoURL ?? u.avatar ?? undefined;
                const initials =
                  displayName.trim().length > 0
                    ? displayName.trim().slice(0, 2).toUpperCase()
                    : '—';
                return (
                  <CommandItem
                    key={u.uid}
                    className={cn(
                      showBranchSubtitle ? 'items-start gap-3 py-2' : 'items-center gap-2'
                    )}
                    value={`user-${u.uid}`}
                    keywords={[
                      displayName,
                      u.email ?? '',
                      branchLabel,
                      String(u.uid),
                      u.name ?? '',
                      u.surname ?? '',
                    ]}
                    onSelect={() => {
                      onUidChange(String(u.uid));
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        showBranchSubtitle ? 'mt-1' : '',
                        'size-4 shrink-0',
                        selectedUid === String(u.uid) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={imgSrc ?? undefined} alt={displayName} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    {showBranchSubtitle ? (
                      <span className="block min-w-0 flex-1 space-y-0.5">
                        <span className="block font-medium leading-tight">{displayName}</span>
                        <span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
                          <span aria-hidden>{branchFlag}</span>
                          <span className="min-w-0 leading-tight truncate">{branchLabel}</span>
                        </span>
                      </span>
                    ) : (
                      <span className="min-w-0 flex-1 truncate font-medium">{displayName}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export interface SearchableOptionRow {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Extra tokens for fuzzy search */
  searchExtra?: string;
}

export interface SearchableOptionListPickerProps {
  /** Use `'all'` for no selection when options are categorical */
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: SearchableOptionRow[];
  triggerClassName?: string;
  placeholderLabelWhenAll?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Prefix icon on trigger when value is "all" / empty display */
  triggerIcon?: React.ReactNode;
  disabled?: boolean;
  /** When false, omits the leading "All" row (pickers that must always have a concrete value). Default true. */
  includeAllOption?: boolean;
  /** Value emitted when the synthetic "All" row is chosen. Default `'all'`. */
  allOptionValue?: string;
}

export function SearchableOptionListPicker({
  selectedValue,
  onValueChange,
  options,
  triggerClassName,
  placeholderLabelWhenAll,
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results.',
  triggerIcon,
  disabled = false,
  includeAllOption = true,
  allOptionValue = 'all',
}: SearchableOptionListPickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedRow = React.useMemo(
    () => options.find((o) => o.value === selectedValue),
    [options, selectedValue]
  );

  const triggerLabel =
    selectedValue === allOptionValue || !selectedRow
      ? (placeholderLabelWhenAll ?? 'All')
      : selectedRow.label;

  const leftIcon =
    selectedValue !== allOptionValue && selectedRow?.icon != null
      ? selectedRow.icon
      : triggerIcon;

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={(next) => {
        if (!disabled) setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={disabled ? false : open}
          disabled={disabled}
          className={cn(
            reportsFilterSelectTriggerClass,
            'justify-between font-normal gap-2',
            triggerClassName
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {leftIcon ? (
              <span className="shrink-0 text-muted-foreground [&_svg]:size-4">{leftIcon}</span>
            ) : null}
            <span className="truncate text-left">{triggerLabel}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
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
              {includeAllOption ? (
              <CommandItem
                value={`${allOptionValue} ${placeholderLabelWhenAll ?? ''}`}
                onSelect={() => {
                  onValueChange(allOptionValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'size-4 shrink-0',
                    selectedValue === allOptionValue ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                  {triggerIcon ? (
                    <span className="shrink-0 text-muted-foreground [&_svg]:size-4">
                      {triggerIcon}
                    </span>
                  ) : null}
                  {placeholderLabelWhenAll ?? 'All'}
                </span>
              </CommandItem>
              ) : null}
              {options.map((row) => {
                const cmdValue = `${row.label} ${row.value} ${row.searchExtra ?? ''}`;
                return (
                  <CommandItem
                    key={row.value}
                    value={cmdValue}
                    onSelect={() => {
                      onValueChange(row.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        selectedValue === row.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                      {row.icon ? (
                        <span className="shrink-0 text-muted-foreground [&_svg]:size-4">
                          {row.icon}
                        </span>
                      ) : null}
                      {row.label}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
