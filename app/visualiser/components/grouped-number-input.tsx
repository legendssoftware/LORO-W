'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  formatGroupedNumber,
  formatGroupedNumberInput,
  parseGroupedNumber,
} from '@/lib/format-grouped-number';

interface GroupedNumberInputProps {
  id: string;
  value: number;
  onValueChange: (value: number) => void;
  allowDecimal?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
}

/**
 * Short numeric field that shows thousands commas.
 * Range limits apply when the field blurs so a value can be typed digit by digit.
 */
export function GroupedNumberInput({
  id,
  value,
  onValueChange,
  allowDecimal = false,
  min,
  max,
  placeholder,
  className,
}: GroupedNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? formatGroupedNumber(value, allowDecimal);

  function commit(next: number) {
    let clamped = next;
    if (min != null) clamped = Math.max(min, clamped);
    if (max != null) clamped = Math.min(max, clamped);
    onValueChange(clamped);
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={shown}
      placeholder={placeholder}
      className={cn('h-8 w-28 px-2 text-xs tabular-nums', className)}
      onFocus={() => setDraft(formatGroupedNumber(value, allowDecimal))}
      onChange={(event) => {
        const display = formatGroupedNumberInput(
          event.target.value,
          allowDecimal,
        );
        setDraft(display);
        const parsed = parseGroupedNumber(display);
        if (parsed == null) return;
        onValueChange(parsed);
      }}
      onBlur={() => {
        const parsed = draft == null ? value : parseGroupedNumber(draft);
        setDraft(null);
        if (parsed == null) return;
        commit(parsed);
      }}
    />
  );
}
