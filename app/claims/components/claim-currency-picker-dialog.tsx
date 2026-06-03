'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  buildClaimCurrencyPickerRows,
  getClaimCurrencyTriggerLabel,
} from '@/lib/currencies';
import { Check, ChevronsUpDown, Coins, Search, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const nestedDialogOverlayClass = 'z-[10001]';
const nestedDialogContentClass = 'z-[10002]';

export function ClaimCurrencyPickerTrigger({
  value,
  onClick,
  disabled,
  className,
}: {
  value: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-9 w-full justify-between gap-2 border-border bg-background font-normal',
        className
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Coins className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-left">
          {getClaimCurrencyTriggerLabel(value)}
        </span>
      </span>
      <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
    </Button>
  );
}

export function ClaimCurrencyPickerDialog({
  open,
  onOpenChange,
  selectedValue,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedValue: string;
  onSelect: (code: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const rows = useMemo(() => buildClaimCurrencyPickerRows(), []);

  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.searchText.includes(q));
  }, [rows, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={nestedDialogOverlayClass}
        className={cn(
          nestedDialogContentClass,
          'flex max-h-[85vh] flex-col overflow-hidden sm:max-w-md'
        )}
      >
        <DialogHeader>
          <DialogTitle>Select currency</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by country or currency…"
            className="pl-9"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
              <Search className="size-5 opacity-50" />
              No currency found
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredRows.map((row) => {
                const selected = selectedValue === row.code;
                return (
                  <li key={row.code}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-violet-50',
                        selected && 'bg-violet-50'
                      )}
                      onClick={() => {
                        onSelect(row.code);
                        onOpenChange(false);
                      }}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                        <Wallet className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{row.label}</span>
                      {selected ? (
                        <Check className="size-4 shrink-0 text-violet-600" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ClaimCurrencyField({
  value,
  onChange,
  disabled,
  triggerClassName,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ClaimCurrencyPickerTrigger
        value={value}
        disabled={disabled}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      />
      <ClaimCurrencyPickerDialog
        open={open}
        onOpenChange={setOpen}
        selectedValue={value}
        onSelect={onChange}
      />
    </>
  );
}
