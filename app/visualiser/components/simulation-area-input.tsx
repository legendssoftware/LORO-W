'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';

interface SimulationAreaInputProps {
  value: string;
  suggestions: string[];
  onChange: (area: string) => void;
  onCommit?: (area: string) => void;
}

/**
 * Free-text area for a simulation. Suggestions come from mapped places, and any typed string is kept.
 */
export function SimulationAreaInput({
  value,
  suggestions,
  onChange,
  onCommit,
}: SimulationAreaInputProps) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const needle = value.trim().toLowerCase();
    const list = needle
      ? suggestions.filter((place) => place.toLowerCase().includes(needle))
      : suggestions;
    return list.slice(0, 8);
  }, [suggestions, value]);

  return (
    <Popover open={open && matches.length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          id="sim-area"
          value={value}
          placeholder="e.g. Polokwane, Sandton, KwaZulu-Natal"
          autoComplete="off"
          className="h-8 text-xs"
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            const trimmed = value.trim();
            if (trimmed) onCommit?.(trimmed);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              setOpen(false);
              const trimmed = value.trim();
              if (trimmed) onCommit?.(trimmed);
            }
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <ul className="max-h-48 overflow-auto">
          {matches.map((place) => (
            <li key={place}>
              <button
                type="button"
                className="hover:bg-accent hover:text-accent-foreground w-full rounded-sm px-2 py-1.5 text-left text-xs"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(place);
                  onCommit?.(place);
                  setOpen(false);
                }}
              >
                {place}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
