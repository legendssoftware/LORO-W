'use client';

import { useMemo, useState } from 'react';
import { ChevronDownIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  approvalTypeLabel,
  filterApprovalTypeGroups,
} from '@/lib/approval-type-groups';

export function ApprovableTypesPicker({
  value,
  onChange,
  triggerClassName,
}: {
  value: string[] | undefined;
  onChange: (next: string[]) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = value ?? [];
  const groups = useMemo(() => filterApprovalTypeGroups(search), [search]);

  return (
    <FormItem>
      <FormLabel>Can approve</FormLabel>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearch('');
        }}
      >
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                'w-full justify-between font-normal',
                !selected.length && 'text-muted-foreground',
                triggerClassName,
              )}
            >
              {selected.length
                ? selected.length <= 2
                  ? selected.map(approvalTypeLabel).join(', ')
                  : `${selected.length} types selected`
                : 'None — will not receive requests'}
              <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search approval types…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[280px]">
              {groups.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground py-3 text-center sm:py-4">
                  No types found.
                </p>
              ) : (
                groups.map((group) => (
                  <CommandGroup key={group.id} heading={group.label} className="p-2">
                    {group.types.map((type) => {
                      const checked = selected.includes(type.value);
                      return (
                        <label
                          key={type.value}
                          className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              if (next) {
                                onChange([...selected, type.value]);
                                return;
                              }
                              onChange(selected.filter((item) => item !== type.value));
                            }}
                          />
                          <span className="text-sm">{type.label}</span>
                        </label>
                      );
                    })}
                  </CommandGroup>
                ))
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <FormDescription>
        Leave empty if this person should not receive approval requests.
      </FormDescription>
      <FormMessage />
    </FormItem>
  );
}
