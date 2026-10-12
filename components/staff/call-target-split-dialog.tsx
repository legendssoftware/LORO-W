'use client';

import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SA_CALL_DAY_RATES,
  sumCallTargets,
  weeklyCallTarget,
  type CallDayRates,
} from '@/lib/utils/call-day-rates';

/**
 * Edits Mon–Thu, Friday and Saturday call rates.
 * Applying writes the three rates and the period total onto the surrounding target form.
 */
export function CallTargetSplitDialog() {
  const form = useFormContext();
  const [open, setOpen] = useState(false);
  const periodStart = useWatch({ control: form.control, name: 'periodStartDate' }) as
    | string
    | null
    | undefined;
  const periodEnd = useWatch({ control: form.control, name: 'periodEndDate' }) as
    | string
    | null
    | undefined;
  const savedMonThu = useWatch({ control: form.control, name: 'callTargetMonThu' }) as
    | number
    | null
    | undefined;
  const savedFriday = useWatch({ control: form.control, name: 'callTargetFriday' }) as
    | number
    | null
    | undefined;
  const savedSaturday = useWatch({ control: form.control, name: 'callTargetSaturday' }) as
    | number
    | null
    | undefined;
  const targetCalls = useWatch({ control: form.control, name: 'targetCalls' }) as
    | number
    | null
    | undefined;

  const savedRates = ratesOrNull(savedMonThu, savedFriday, savedSaturday);
  const [draft, setDraft] = useState<CallDayRates>(savedRates ?? SA_CALL_DAY_RATES);

  const week = weeklyCallTarget(draft);
  const month =
    periodStart && periodEnd
      ? sumCallTargets(String(periodStart), String(periodEnd), draft)
      : null;

  function openDialog() {
    setDraft(savedRates ?? SA_CALL_DAY_RATES);
    setOpen(true);
  }

  function applyRates() {
    form.setValue('callTargetMonThu', draft.monThu, { shouldDirty: true });
    form.setValue('callTargetFriday', draft.friday, { shouldDirty: true });
    form.setValue('callTargetSaturday', draft.saturday, { shouldDirty: true });
    if (month != null) {
      form.setValue('targetCalls', month, { shouldDirty: true });
    }
    setOpen(false);
  }

  const summary = savedRates
    ? `${savedRates.monThu} Mon–Thu · ${savedRates.friday} Fri · ${savedRates.saturday} Sat · ${weeklyCallTarget(savedRates)} / week`
    : 'One number for every working day';

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="target-calls-month">Target calls this period</Label>
          <Input
            id="target-calls-month"
            type="number"
            readOnly={savedRates != null}
            value={targetCalls ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              form.setValue('targetCalls', value === '' ? null : Number(value), {
                shouldDirty: true,
              });
            }}
          />
        </div>
        <Button type="button" variant="outline" onClick={openDialog}>
          Set by day
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{summary}</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Call targets by day</DialogTitle>
            <DialogDescription>
              Monday to Thursday, Friday, and Saturday can each have their own number.
              Hours differ: weekdays run 07:00–16:30 and Saturday is a half day, 07:00–12:00.
              Sunday stays closed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <RateField
              id="call-mon-thu"
              label="Monday – Thursday"
              hint="Full day, 07:00–16:30"
              value={draft.monThu}
              onChange={(monThu) => setDraft((current) => ({ ...current, monThu }))}
            />
            <RateField
              id="call-friday"
              label="Friday"
              hint="Full hours, lower call target"
              value={draft.friday}
              onChange={(friday) => setDraft((current) => ({ ...current, friday }))}
            />
            <RateField
              id="call-saturday"
              label="Saturday"
              hint="Half day, 07:00–12:00"
              value={draft.saturday}
              onChange={(saturday) => setDraft((current) => ({ ...current, saturday }))}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {draft.monThu * 4} + {draft.friday} + {draft.saturday} = {week} calls a week
            {month != null ? ` · ${month} this period` : ''}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyRates}>
              Apply to target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RateField(props: {
  id: string;
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type="number"
        min={0}
        value={Number.isFinite(props.value) ? props.value : 0}
        onChange={(event) => {
          const next = Number(event.target.value);
          props.onChange(Number.isFinite(next) && next >= 0 ? next : 0);
        }}
      />
      <p className="text-xs text-muted-foreground">{props.hint}</p>
    </div>
  );
}

function ratesOrNull(
  monThu: number | null | undefined,
  friday: number | null | undefined,
  saturday: number | null | undefined
): CallDayRates | null {
  if (monThu == null || friday == null || saturday == null) return null;
  if (![monThu, friday, saturday].every((n) => Number.isFinite(Number(n)))) return null;
  return { monThu: Number(monThu), friday: Number(friday), saturday: Number(saturday) };
}
