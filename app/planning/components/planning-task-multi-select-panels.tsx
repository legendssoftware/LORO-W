'use client';

import * as React from 'react';
import type { UserListItem } from '@/api/endpoints/user';
import type { ClientListItem } from '@/api/types/clients';
import type { BranchListItem } from '@/api/types/branch';
import { branchFlagAndLabel } from '@/app/reports/utils/branch-person-cell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { StoreIcon } from '@/lib/icons';

function userDisplayName(u: UserListItem): string {
  return (
    [u.name, u.surname].filter(Boolean).join(' ').trim() ||
    u.email ||
    `User ${u.uid}`
  );
}

export interface PlanningAssigneesMultiSelectPanelProps {
  users: UserListItem[];
  branches: BranchListItem[];
  selectedUids: number[];
  onToggleUid: (uid: number) => void;
  searchPlaceholder?: string;
}

export function PlanningAssigneesMultiSelectPanel({
  users,
  branches,
  selectedUids,
  onToggleUid,
  searchPlaceholder = 'Search users…',
}: PlanningAssigneesMultiSelectPanelProps) {
  const branchByUid = React.useMemo(
    () => new Map<number, BranchListItem>(branches.map((b) => [b.uid, b])),
    [branches]
  );

  return (
    <Command className="rounded-lg border-0 shadow-none">
      <CommandInput placeholder={searchPlaceholder} className="h-9" />
      <CommandList className="max-h-[240px]">
        <CommandEmpty>No user found.</CommandEmpty>
        <CommandGroup>
          {users.map((u) => {
            const displayName = userDisplayName(u);
            const { flag: branchFlag, label: branchLabel } = branchFlagAndLabel(
              u,
              branchByUid
            );
            const imgSrc = u.photoURL ?? u.avatar ?? undefined;
            const initials =
              displayName.trim().length > 0
                ? displayName.trim().slice(0, 2).toUpperCase()
                : '—';
            const searchBlob = `${displayName} ${u.email ?? ''} ${branchLabel} ${u.uid}`;
            return (
              <CommandItem
                key={u.uid}
                value={searchBlob}
                className="cursor-pointer items-start gap-2 py-2"
                onSelect={() => onToggleUid(u.uid)}
              >
                <Checkbox
                  checked={selectedUids.includes(u.uid)}
                  className="mt-1 shrink-0 pointer-events-none"
                  tabIndex={-1}
                  aria-hidden
                />
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={imgSrc ?? undefined} alt={displayName} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="block min-w-0 flex-1 space-y-0.5">
                  <span className="block font-medium leading-tight">{displayName}</span>
                  <span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
                    <span aria-hidden>{branchFlag}</span>
                    <span className="min-w-0 leading-tight truncate">{branchLabel}</span>
                  </span>
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export interface PlanningClientsMultiSelectPanelProps {
  clients: ClientListItem[];
  selectedUids: number[];
  onToggleUid: (uid: number) => void;
  searchPlaceholder?: string;
}

export function PlanningClientsMultiSelectPanel({
  clients,
  selectedUids,
  onToggleUid,
  searchPlaceholder = 'Search clients…',
}: PlanningClientsMultiSelectPanelProps) {
  return (
    <Command className="rounded-lg border-0 shadow-none">
      <CommandInput placeholder={searchPlaceholder} className="h-9" />
      <CommandList className="max-h-[240px]">
        <CommandEmpty>No client found.</CommandEmpty>
        <CommandGroup>
          {clients.map((c) => {
            const searchBlob = `${c.name} ${c.uid}`;
            return (
              <CommandItem
                key={c.uid}
                value={searchBlob}
                className="cursor-pointer items-center gap-2 py-2"
                onSelect={() => onToggleUid(c.uid)}
              >
                <Checkbox
                  checked={selectedUids.includes(c.uid)}
                  className="shrink-0 pointer-events-none"
                  tabIndex={-1}
                  aria-hidden
                />
                <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {c.name}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
