'use client';

import { useEffect, useState } from 'react';
import { CalendarIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  birthdateRange,
  defaultDateRange,
  formatIsoToDisplay,
  maskDisplayDate,
  parseFlexibleDate,
  toIsoDateString,
  type DatePickerPreset,
} from '@/lib/user-form/date-input';

export function DatePickerField({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  disabled,
  className,
  id,
  preset = 'default',
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  preset?: DatePickerPreset;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => formatIsoToDisplay(value));
  const selected = parseFlexibleDate(value ?? '') ?? undefined;

  useEffect(() => {
    setText(formatIsoToDisplay(value));
  }, [value]);

  const birth = birthdateRange();
  const standard = defaultDateRange();
  const range = preset === 'birthdate' ? birth : standard;
  const defaultMonth = selected ?? range.defaultMonth;

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
    <div className={cn('flex gap-2', className)}>
      <Input
        id={id}
        value={text}
        onChange={(event) => commitText(event.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="numeric"
        autoComplete={preset === 'birthdate' ? 'bday' : 'off'}
        aria-label={ariaLabel ?? placeholder}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className="flex-1"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            aria-label={ariaLabel ? `${ariaLabel} calendar` : 'Open calendar'}
            className="size-9 shrink-0"
          >
            <CalendarIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={defaultMonth}
            startMonth={range.startMonth}
            endMonth={range.endMonth}
            disabled={
              preset === 'birthdate'
                ? { before: birth.fromDate, after: birth.toDate }
                : undefined
            }
            onSelect={(date) => {
              onChange(date ? toIsoDateString(date) : null);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
