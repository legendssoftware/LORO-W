'use client';

import { useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

function parseDateValue(value?: string | null): Date | undefined {
  if (!value?.trim()) return undefined;
  const parsed = parseISO(value.trim());
  return isValid(parsed) ? parsed : undefined;
}

export function DatePickerField({
  value,
  onChange,
  placeholder = 'Pick date',
  disabled,
  className,
}: {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-9 w-full justify-start font-normal',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          {selected ? format(selected, 'MMM d, yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            onChange(d ? format(d, 'yyyy-MM-dd') : null);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
