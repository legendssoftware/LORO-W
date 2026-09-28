'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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

interface SimulationCityComboboxProps {
  value: string;
  options: string[];
  onChange: (city: string) => void;
}

/**
 * Type a city or pick one from mapped sites. Empty value means every city.
 */
export function SimulationCityCombobox({
  value,
  options,
  onChange,
}: SimulationCityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    if (!open) setQuery(value);
  }, [open, value]);

  const trimmed = query.trim();
  const filtered = useMemo(() => {
    const needle = trimmed.toLowerCase();
    if (!needle) return options;
    return options.filter((city) => city.toLowerCase().includes(needle));
  }, [options, trimmed]);
  const hasExact = options.some(
    (city) => city.toLowerCase() === trimmed.toLowerCase(),
  );

  function applyCity(city: string) {
    onChange(city.trim());
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="sim-city"
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between px-2 text-xs font-normal"
        >
          <span className="truncate">{value.trim() || 'All cities'}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type a city…"
            value={query}
            onValueChange={setQuery}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || !trimmed) return;
              event.preventDefault();
              applyCity(trimmed);
            }}
          />
          <CommandList>
            <CommandEmpty>
              {trimmed
                ? `Press Enter to use “${trimmed}”.`
                : 'No mapped cities in this scope.'}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem value="all-cities" onSelect={() => applyCity('')}>
                <Check
                  className={cn(
                    'size-4',
                    value.trim() ? 'opacity-0' : 'opacity-100',
                  )}
                />
                All cities
              </CommandItem>
              {!hasExact && trimmed ? (
                <CommandItem
                  value={`use-${trimmed}`}
                  onSelect={() => applyCity(trimmed)}
                >
                  <Check className="size-4 opacity-0" />
                  Use “{trimmed}”
                </CommandItem>
              ) : null}
              {filtered.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => applyCity(city)}
                >
                  <Check
                    className={cn(
                      'size-4',
                      value.trim().toLowerCase() === city.toLowerCase()
                        ? 'opacity-100'
                        : 'opacity-0',
                    )}
                  />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
