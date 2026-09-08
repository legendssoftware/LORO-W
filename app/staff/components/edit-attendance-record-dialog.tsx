'use client';

import { useMemo, useState } from 'react';
import { format, isSameDay, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { useAdjustUserAttendanceRecordMutation } from '@/api/hooks';
import { formatAttendanceClockTime } from '@/lib/attendance-time';
import { formatMinutesToDuration } from '@/lib/duration';
import { getQueryErrorMessage } from '@/lib/api/query-error';
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
import type { MonthlyCalendarAttendanceRecord } from '@/api/types/attendance';

function previewDuration(
  checkIn: string,
  checkOut: string,
  nextDayClockOut: boolean
): string {
  if (!checkIn || !checkOut) return 'Incomplete (no check-out)';
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  let mins = outH * 60 + outM - (inH * 60 + inM);
  if (nextDayClockOut) mins += 24 * 60;
  if (mins <= 0) return 'Check-out must be after check-in';
  return formatMinutesToDuration(mins);
}

function timesFromRecord(attendanceRecord?: MonthlyCalendarAttendanceRecord) {
  const checkIn = formatAttendanceClockTime(attendanceRecord?.checkIn) || '07:00';
  const checkOut = formatAttendanceClockTime(attendanceRecord?.checkOut);
  let nextDayClockOut = false;
  if (attendanceRecord?.checkIn && attendanceRecord.checkOut) {
    try {
      const inDate = new Date(attendanceRecord.checkIn);
      const outDate = new Date(attendanceRecord.checkOut);
      nextDayClockOut = isSameDay(outDate, addDays(inDate, 1));
    } catch {
      nextDayClockOut = false;
    }
  }
  return { checkIn, checkOut, nextDayClockOut };
}

export function EditAttendanceRecordDialog({
  open,
  onOpenChange,
  userRef,
  userName,
  date,
  attendanceRecord,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRef: string;
  userName: string;
  date: string;
  attendanceRecord?: MonthlyCalendarAttendanceRecord;
}) {
  const mutation = useAdjustUserAttendanceRecordMutation();
  const initial = timesFromRecord(attendanceRecord);
  const [checkIn, setCheckIn] = useState(initial.checkIn);
  const [checkOut, setCheckOut] = useState(initial.checkOut);
  const [nextDayClockOut, setNextDayClockOut] = useState(initial.nextDayClockOut);

  const durationPreview = useMemo(
    () => previewDuration(checkIn, checkOut, nextDayClockOut),
    [checkIn, checkOut, nextDayClockOut]
  );

  function handleSave() {
    if (!checkIn) {
      toast.error('Check-in time is required');
      return;
    }
    mutation.mutate(
      {
        ref: userRef,
        body: {
          date,
          checkIn,
          checkOut: checkOut.trim() ? checkOut : null,
          nextDayClockOut: checkOut.trim() ? nextDayClockOut : false,
        },
      },
      {
        onSuccess: () => {
          toast.success('Attendance times updated');
          onOpenChange(false);
        },
        onError: (err: Error) => {
          toast.error(getQueryErrorMessage(err, 'Failed to update attendance'));
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md z-[60]"
        overlayClassName="z-[60]"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Edit attendance times</DialogTitle>
          <DialogDescription>
            {userName} — {format(new Date(`${date}T12:00:00`), 'EEE, MMM d, yyyy')}. Duration,
            late, and overtime are recalculated on save.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-att-check-in">Check-in</Label>
            <Input
              id="edit-att-check-in"
              type="time"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-att-check-out">Check-out</Label>
            <Input
              id="edit-att-check-out"
              type="time"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Leave empty for an incomplete day.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={nextDayClockOut}
              disabled={!checkOut}
              onCheckedChange={(value) => setNextDayClockOut(value === true)}
            />
            Next-day clock-out
          </label>
          <p className="text-sm text-muted-foreground">
            Shift duration preview: <span className="font-medium text-foreground">{durationPreview}</span>
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
