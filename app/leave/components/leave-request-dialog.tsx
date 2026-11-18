'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCreateLeaveMutation } from '@/api/hooks/use-leaves';
import {
  LEAVE_TYPE_OPTIONS,
  type HalfDayPeriodCode,
  type LeaveTypeCode,
} from '@/api/types/leave';
import { countWeekdayLeaveDuration } from '@/app/leave/lib/leave-display';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const primaryButtonClass =
  'border-0 bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500';

export function LeaveRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateLeaveMutation();
  const [leaveType, setLeaveType] = useState<LeaveTypeCode>('ANNUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<HalfDayPeriodCode>('FIRST_HALF');
  const [isPaid, setIsPaid] = useState(true);
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLeaveType('ANNUAL');
    setStartDate('');
    setEndDate('');
    setIsHalfDay(false);
    setHalfDayPeriod('FIRST_HALF');
    setIsPaid(true);
    setIsPublicHoliday(false);
    setMotivation('');
    setFormError(null);
  }, [open]);

  const duration = useMemo(
    () => countWeekdayLeaveDuration(startDate, endDate, isHalfDay),
    [startDate, endDate, isHalfDay]
  );

  function handleTypeChange(value: string) {
    const next = value as LeaveTypeCode;
    setLeaveType(next);
    if (next === 'UNPAID') setIsPaid(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!startDate || !endDate) {
      setFormError('Choose a start date and an end date.');
      return;
    }
    if (duration == null) {
      setFormError('The end date must be on or after the start date.');
      return;
    }
    if (duration <= 0) {
      setFormError('Choose dates that include at least part of a weekday.');
      return;
    }
    createMutation.mutate(
      {
        leaveType,
        startDate,
        endDate,
        duration,
        motivation: motivation.trim() || undefined,
        isHalfDay,
        ...(isHalfDay ? { halfDayPeriod } : {}),
        isPublicHoliday,
        isPaid,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request leave</DialogTitle>
          <DialogDescription>
            The request is sent as pending. Weekends are not counted in the duration.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="leave-type">Type</Label>
            <Select value={leaveType} onValueChange={handleTypeChange}>
              <SelectTrigger id="leave-type" className="w-full">
                <SelectValue placeholder="Leave type" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="leave-start">Start</Label>
              <Input
                id="leave-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leave-end">End</Label>
              <Input
                id="leave-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Duration: {duration == null || duration <= 0 ? '—' : `${duration} ${duration === 1 ? 'day' : 'days'}`}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isHalfDay}
              onCheckedChange={(checked) => setIsHalfDay(checked === true)}
            />
            Half day
          </label>
          {isHalfDay ? (
            <div className="grid gap-2">
              <Label htmlFor="leave-half">Half-day period</Label>
              <Select
                value={halfDayPeriod}
                onValueChange={(value) => setHalfDayPeriod(value as HalfDayPeriodCode)}
              >
                <SelectTrigger id="leave-half" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIRST_HALF">Morning</SelectItem>
                  <SelectItem value="SECOND_HALF">Afternoon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isPaid} onCheckedChange={(checked) => setIsPaid(checked === true)} />
            Paid leave
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isPublicHoliday}
              onCheckedChange={(checked) => setIsPublicHoliday(checked === true)}
            />
            Public holiday
          </label>
          <div className="grid gap-2">
            <Label htmlFor="leave-reason">Reason</Label>
            <Textarea
              id="leave-reason"
              value={motivation}
              onChange={(event) => setMotivation(event.target.value)}
              placeholder="Optional note for your manager"
              rows={3}
            />
          </div>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" className={cn(primaryButtonClass)} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
