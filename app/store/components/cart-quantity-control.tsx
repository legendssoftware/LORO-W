'use client';

import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CartQuantityControlProps {
  quantity: number;
  onChange: (quantity: number) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function CartQuantityControl({
  quantity,
  onChange,
  size = 'sm',
  className,
}: CartQuantityControlProps) {
  const [draft, setDraft] = useState(String(quantity));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(String(quantity));
    }
  }, [quantity, isFocused]);

  function commitDraft(value: string) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      onChange(0);
      return;
    }
    onChange(parsed);
  }

  function handleBlur() {
    setIsFocused(false);
    commitDraft(draft);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  const buttonSize = size === 'md' ? 'size-8' : 'size-8';
  const inputWidth = size === 'md' ? 'min-w-10 w-12' : 'min-w-8 w-10';

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className={cn('shrink-0 rounded-full', buttonSize)}
        onClick={() => onChange(quantity - 1)}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </Button>
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-8 shrink-0 rounded-md border border-border bg-background px-1 text-center text-sm font-semibold shadow-none focus-visible:border-gray-300 focus-visible:ring-1 focus-visible:ring-gray-200',
          inputWidth
        )}
        aria-label="Quantity"
      />
      <Button
        type="button"
        size="icon"
        className={cn(
          'shrink-0 rounded-full bg-purple-600 text-white hover:bg-purple-700',
          buttonSize
        )}
        onClick={() => onChange(quantity + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}
