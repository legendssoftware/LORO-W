'use client';

import { useMemo } from 'react';
import { format, subMonths, startOfDay, endOfDay, eachDayOfInterval, getDay, addDays } from 'date-fns';
import { useMonthlyAttendance } from '@/api/hooks';
import type { ReportCardUser } from '@/app/reports/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { XIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface AttendanceRecordShape {
  checkIn?: string;
  checkOut?: string | null;
  duration?: string | null;
  lateMinutes?: number | null;
}

type RowStatus = 'present' | 'late' | 'incomplete' | 'missed' | 'weekend';

interface DayRecord {
  date: string;
  status: RowStatus;
  attendanceRecord?: AttendanceRecordShape;
}

export function UserAttendanceRecordsModal({
  user,
  onClose,
}: {
  user: ReportCardUser | null;
  onClose: () => void;
}) {
  const open = !!user;
  const today = new Date();

  const { periodStartStr, periodEndStr, periodStart, periodEnd } = useMemo(() => {
    const start = startOfDay(new Date(today.getFullYear(), today.getMonth() - 1, 26));
    const endRaw = new Date(today.getFullYear(), today.getMonth(), 25);
    const end = today <= endRaw ? endOfDay(today) : endOfDay(endRaw);
    return {
      periodStartStr: format(start, 'yyyy-MM-dd'),
      periodEndStr: format(end, 'yyyy-MM-dd'),
      periodStart: start,
      periodEnd: end,
    };
  }, [today.getTime()]);

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const prevDate = subMonths(today, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;

  const currentMonthQuery = useMonthlyAttendance(
    user?.ref ?? null,
    currentYear,
    currentMonth,
    { enabled: open && !!user?.ref }
  );

  const prevMonthQuery = useMonthlyAttendance(
    user?.ref ?? null,
    prevYear,
    prevMonth,
    { enabled: open && !!user?.ref }
  );

  const isLoading = currentMonthQuery.isLoading || prevMonthQuery.isLoading;

  const records = useMemo((): DayRecord[] => {
    const attendanceByDate = new Map<
      string,
      { status: string; attendanceRecord?: AttendanceRecordShape }
    >();

    const currentDays = (currentMonthQuery.data?.days ?? []) as Array<{
      date: string;
      status: string;
      attendanceRecord?: AttendanceRecordShape;
    }>;
    const prevDays = (prevMonthQuery.data?.days ?? []) as Array<{
      date: string;
      status: string;
      attendanceRecord?: AttendanceRecordShape;
    }>;

    for (const d of [...prevDays, ...currentDays]) {
      if (d.date >= periodStartStr && d.date <= periodEndStr) {
        attendanceByDate.set(d.date, {
          status: d.status,
          attendanceRecord: d.attendanceRecord,
        });
      }
    }

    const allDates = eachDayOfInterval({ start: periodStart, end: periodEnd });

    const rows: DayRecord[] = allDates.flatMap((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const att = attendanceByDate.get(dateStr);
      const isSunday = getDay(d) === 0;

      if (isSunday) {
        return [{
          date: dateStr,
          status: 'weekend' as RowStatus,
          attendanceRecord: att?.status === 'attended' ? att.attendanceRecord : undefined,
        }];
      }

      if (!att || att.status === 'missed') {
        return [{
          date: dateStr,
          status: 'missed' as RowStatus,
          attendanceRecord: undefined,
        }];
      }

      const rec = att.attendanceRecord;
      const hasCheckOut = rec?.checkOut != null && rec.checkOut !== '';
      const isLate = (rec?.lateMinutes ?? 0) > 0;

      let rowStatus: RowStatus = 'present';
      if (!hasCheckOut) rowStatus = 'incomplete';
      else if (isLate) rowStatus = 'late';

      return [{
        date: dateStr,
        status: rowStatus,
        attendanceRecord: rec,
      }];
    });

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [
    currentMonthQuery.data?.days,
    prevMonthQuery.data?.days,
    periodStartStr,
    periodEndStr,
    periodStart,
    periodEnd,
  ]);

  const formatTime = (iso?: string | null): string => {
    if (!iso) return '—';
    try {
      return format(new Date(iso), 'HH:mm');
    } catch {
      return '—';
    }
  };

  const getRowClassName = (index: number, status: RowStatus): string => {
    const isHighlighted =
      status === 'missed' || status === 'incomplete' || status === 'late';
    const isWeekend = status === 'weekend';
    const base = isHighlighted || isWeekend
      ? ''
      : index % 2 === 1
        ? 'bg-muted/30'
        : '';
    const highlight =
      status === 'missed'
        ? 'bg-destructive/10'
        : status === 'incomplete'
          ? 'bg-amber-500/10'
          : status === 'late'
            ? 'bg-amber-500/5'
            : status === 'weekend'
              ? 'bg-muted/50'
              : '';
    return cn(base, highlight);
  };

  const getStatusLabel = (status: RowStatus): string => {
    switch (status) {
      case 'missed':
        return 'Missed';
      case 'incomplete':
        return 'Incomplete';
      case 'late':
        return 'Late';
      case 'weekend':
        return 'Weekend';
      default:
        return 'Present';
    }
  };

  const summary = useMemo(() => {
    const endFull = endOfDay(new Date(today.getFullYear(), today.getMonth(), 25));
    const missed = records.filter((r) => r.status === 'missed').length;
    const attended = records.filter((r) =>
      ['present', 'late', 'incomplete'].includes(r.status) ||
      (r.status === 'weekend' && r.attendanceRecord)
    ).length;
    const tomorrow = addDays(startOfDay(today), 1);
    const futureDays =
      tomorrow <= endFull
        ? eachDayOfInterval({ start: tomorrow, end: endFull })
        : [];
    const remaining = futureDays.filter((d) => getDay(d) !== 0).length;
    return { missed, attended, remaining };
  }, [records, today]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col w-full max-w-[calc(100%-2rem)] sm:max-w-[70vw] max-h-[85vh] sm:max-h-[90vh] p-4 sm:p-6"
      >
        <div className="flex items-start justify-between gap-2 shrink-0">
          <DialogHeader>
            <DialogTitle>
              {user ? `${user.name} – Attendance Records` : 'Attendance Records'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Current payroll period (26th prev month – 25th current month)
            </p>
          </DialogHeader>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 shadow-none focus:ring-0"
            aria-label="Close"
          >
            <XIcon className="size-4 text-red-600" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 max-h-[60vh]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8">
              Loading attendance records…
            </p>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8">
              No attendance records for the current payroll period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r, index) => (
                  <TableRow
                    key={r.date}
                    className={getRowClassName(index, r.status)}
                  >
                    <TableCell className="font-medium">
                      {format(new Date(r.date), 'EEE, MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'text-xs font-bold',
                          r.status === 'missed' && 'text-destructive',
                          r.status === 'present' && 'text-green-600 dark:text-green-500',
                          r.status === 'incomplete' && 'text-amber-600 dark:text-amber-500',
                          r.status === 'late' && 'text-amber-600 dark:text-amber-500',
                          r.status === 'weekend' && 'text-muted-foreground'
                        )}
                      >
                        {getStatusLabel(r.status)}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatTime(r.attendanceRecord?.checkIn)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatTime(r.attendanceRecord?.checkOut)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {r.attendanceRecord?.duration ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {!isLoading && records.length > 0 && (
          <div className="shrink-0 border-t border-border py-2 px-3 text-sm text-muted-foreground">
            Missed: {summary.missed} · Attended: {summary.attended} · Remaining: {summary.remaining}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
