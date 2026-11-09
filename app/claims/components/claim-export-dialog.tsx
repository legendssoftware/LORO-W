'use client';

import { useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  formatUtcYmd,
  localPickerDateFromUtcCalendarDate,
  localPickerRangeFromUtcCalendarRange,
  orderUtcCalendarRange,
  utcCalendarDateFromLocalPickerDate,
  utcDateFromYmd,
  utcMonthStartThroughToday,
  utcToday,
} from '@/lib/utils/overview-daily-summary';

export interface ClaimExportRange {
  from: string;
  to: string;
}

/** Asks for a calendar range before exporting claims. Empty dates mean all dates. */
export function ClaimExportDialog({
  open,
  onOpenChange,
  initialFrom,
  initialTo,
  exporting,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFrom: string;
  initialTo: string;
  exporting: boolean;
  onExport: (range: ClaimExportRange) => void;
}) {
  const [allDates, setAllDates] = useState(true);
  const [draft, setDraft] = useState<DateRange | undefined>();

  useEffect(() => {
    if (!open) return;
    const hasRange = Boolean(initialFrom && initialTo);
    setAllDates(!hasRange);
    setDraft(
      hasRange
        ? localPickerRangeFromUtcCalendarRange({
            from: utcDateFromYmd(initialFrom),
            to: utcDateFromYmd(initialTo),
          })
        : undefined
    );
  }, [open, initialFrom, initialTo]);

  function applyPreset(kind: 'all' | 'today' | 'month') {
    if (kind === 'all') {
      setAllDates(true);
      setDraft(undefined);
      return;
    }
    setAllDates(false);
    if (kind === 'today') {
      const today = utcToday();
      setDraft(localPickerRangeFromUtcCalendarRange({ from: today, to: today }));
      return;
    }
    const month = utcMonthStartThroughToday();
    setDraft(
      localPickerRangeFromUtcCalendarRange({ from: month.start, to: month.end })
    );
  }

  function handleExport() {
    if (allDates || !draft?.from) {
      onExport({ from: '', to: '' });
      return;
    }
    const to = draft.to ?? draft.from;
    const fromUtc = utcCalendarDateFromLocalPickerDate(draft.from);
    const toUtc = utcCalendarDateFromLocalPickerDate(to);
    const ordered = orderUtcCalendarRange(fromUtc, toUtc);
    onExport({
      from: formatUtcYmd(ordered.start),
      to: formatUtcYmd(ordered.end),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export claims</DialogTitle>
          <DialogDescription>
            Choose the dates to include. Status, folder, person, and search stay as they are on the page.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={allDates ? 'default' : 'outline'} onClick={() => applyPreset('all')}>
            All dates
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('today')}>
            Today
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('month')}>
            This month
          </Button>
        </div>
        <Calendar
          mode="range"
          selected={allDates ? undefined : draft}
          defaultMonth={draft?.from ?? localPickerDateFromUtcCalendarDate(utcToday())}
          onSelect={(range) => {
            setAllDates(false);
            setDraft(range);
          }}
          numberOfMonths={1}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-1 bg-violet-600 text-white hover:bg-violet-700"
            disabled={exporting}
            onClick={handleExport}
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
