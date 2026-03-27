'use client';

import { useMemo, type ReactNode } from 'react';
import { format, subMonths, startOfDay, endOfDay, eachDayOfInterval, getDay, addDays, isSameDay } from 'date-fns';
import { Car, Building2, Users } from 'lucide-react';
import { useMonthlyAttendance, useCheckIns, useLeadsReport, useClaims, useSessionSync } from '@/api/hooks';
import type { ReportCardUser } from '@/app/reports/types';
import type { MonthlyCalendarAttendanceRecord } from '@/api/types/attendance';
import type { VisitListItem } from '@/api/types/visits';
import { parseDurationToMinutes, formatMinutesToDuration } from '@/lib/duration';
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

type RowStatus = 'present' | 'late' | 'incomplete' | 'missed' | 'weekend';

type ShiftType = 'same_day' | 'next_day_clockout' | null;

function getShiftType(checkIn?: string | null, checkOut?: string | null): ShiftType {
  if (!checkIn || !checkOut || checkOut === '') return null;
  try {
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (isSameDay(inDate, outDate)) return 'same_day';
    return isSameDay(outDate, addDays(inDate, 1)) ? 'next_day_clockout' : 'same_day';
  } catch {
    return null;
  }
}

interface DayRecord {
  date: string;
  status: RowStatus;
  attendanceRecord?: MonthlyCalendarAttendanceRecord;
  shiftType: ShiftType;
}

/** Per-day aggregates from check-ins (visits), leads report, and claims. */
interface DayMetrics {
  visitCount: number;
  totalVisitMinutes: number;
  officeMinutes: number;
  clientMinutes: number;
  totalSales: number;
  leadsCount: number;
  claimsCount: number;
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
  const { backendUserData: profile } = useSessionSync();
  const currentUserRef = profile?.uid != null ? String(profile.uid) : null;
  const isViewingAnotherUser = open && user != null && currentUserRef != null && user.ref !== currentUserRef;

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

  const checkInsQuery = useCheckIns(
    {
      startDate: periodStartStr,
      endDate: periodEndStr,
      ...(isViewingAnotherUser && user?.ref ? { userUid: user.ref } : {}),
    },
    { enabled: open }
  );
  const leadsReportQuery = useLeadsReport(
    { from: periodStartStr, to: periodEndStr },
    { enabled: open }
  );
  const claimsQuery = useClaims(
    { createdFrom: periodStartStr, createdTo: periodEndStr, limit: 5000 },
    { enabled: open }
  );

  const isLoading =
    currentMonthQuery.isLoading ||
    prevMonthQuery.isLoading ||
    (open && (checkInsQuery.isLoading || leadsReportQuery.isLoading || claimsQuery.isLoading));

  const records = useMemo((): DayRecord[] => {
    const attendanceByDate = new Map<
      string,
      { status: string; attendanceRecord?: MonthlyCalendarAttendanceRecord }
    >();

    const currentDays = (currentMonthQuery.data?.days ?? []) as Array<{
      date: string;
      status: string;
      attendanceRecord?: MonthlyCalendarAttendanceRecord;
    }>;
    const prevDays = (prevMonthQuery.data?.days ?? []) as Array<{
      date: string;
      status: string;
      attendanceRecord?: MonthlyCalendarAttendanceRecord;
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
        const weekendRec = att?.status === 'attended' ? att.attendanceRecord : undefined;
        return [{
          date: dateStr,
          status: 'weekend' as RowStatus,
          attendanceRecord: weekendRec,
          shiftType: getShiftType(weekendRec?.checkIn, weekendRec?.checkOut),
        }];
      }

      if (!att || att.status === 'missed') {
        return [{
          date: dateStr,
          status: 'missed' as RowStatus,
          attendanceRecord: undefined,
          shiftType: null,
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
        shiftType: getShiftType(rec?.checkIn, rec?.checkOut),
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

  const dayMetrics = useMemo((): Record<string, DayMetrics> => {
    const map: Record<string, DayMetrics> = {};
    const empty: DayMetrics = {
      visitCount: 0,
      totalVisitMinutes: 0,
      officeMinutes: 0,
      clientMinutes: 0,
      totalSales: 0,
      leadsCount: 0,
      claimsCount: 0,
    };

    const checkIns = (checkInsQuery.data?.checkIns ?? []) as VisitListItem[];
    // Visit date = check-in date only (matches attendance record date); do not use check-out date.
    for (const c of checkIns) {
      const dateKey = c.checkInTime ? new Date(c.checkInTime).toISOString().slice(0, 10) : '';
      if (!dateKey) continue;
      if (!map[dateKey]) map[dateKey] = { ...empty };
      const m = map[dateKey];
      m.visitCount += 1;
      const mins = parseDurationToMinutes(c.duration);
      m.totalVisitMinutes += mins;
      const isOffice = (c.buildingType ?? '').toLowerCase() === 'office';
      if (isOffice) m.officeMinutes += mins;
      else m.clientMinutes += mins;
      const sales = Number(c.salesValue);
      if (!Number.isNaN(sales) && sales > 0) m.totalSales += sales;
    }

    const byDay = leadsReportQuery.data?.byDay ?? [];
    for (const { date, count } of byDay) {
      if (!map[date]) map[date] = { ...empty };
      map[date].leadsCount = count;
    }

    const claimsList = claimsQuery.data?.data ?? [];
    for (const claim of claimsList) {
      const created = claim.createdAt;
      if (!created) continue;
      const dateKey = new Date(created).toISOString().slice(0, 10);
      if (!map[dateKey]) map[dateKey] = { ...empty };
      map[dateKey].claimsCount += 1;
    }

    return map;
  }, [
    checkInsQuery.data?.checkIns,
    leadsReportQuery.data?.byDay,
    claimsQuery.data?.data,
  ]);

  const formatTime = (iso?: string | null): string => {
    if (!iso) return '—';
    try {
      return format(new Date(iso), 'HH:mm');
    } catch {
      return '—';
    }
  };

  const getRowClassName = (index: number, status: RowStatus, shiftType: ShiftType): string => {
    const isNextDayClockout = shiftType === 'next_day_clockout';
    const isHighlighted =
      status === 'missed' || status === 'incomplete' || status === 'late' || isNextDayClockout;
    const isWeekend = status === 'weekend';
    const base = isHighlighted || isWeekend
      ? ''
      : index % 2 === 1
        ? 'bg-muted/30'
        : '';
    const highlight =
      isNextDayClockout
        ? 'bg-destructive/10'
        : status === 'missed'
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

  const formatZAR = (value: number): string => {
    if (value <= 0) return '—';
    try {
      return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return String(value);
    }
  };

  const formatDistanceKm = (km: number | null | undefined): string => {
    if (km == null || Number.isNaN(Number(km))) return '—';
    const n = Number(km);
    if (n < 0) return '—';
    const rounded = Math.round(n * 100) / 100;
    const isWhole = Number.isInteger(rounded);
    return `${isWhole ? String(rounded) : rounded.toFixed(2)} km`;
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
    const forgottenOuts = records.filter((r) => r.shiftType === 'next_day_clockout').length;
    return { missed, attended, remaining, forgottenOuts };
  }, [records, today]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col w-full w-[80vw] max-w-[80vw] sm:max-w-[80vw] max-h-[85vh] sm:max-h-[90vh] p-4 sm:p-6"
      >
        <div className="flex items-start justify-between gap-2 shrink-0">
          <DialogHeader className="!text-left min-w-0 flex-1 flex flex-col items-start">
            <DialogTitle className="text-base sm:text-lg leading-tight pr-8 text-left w-full">
              {user ? `${user.name} – Attendance Records` : 'Attendance Records'}
            </DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 text-left w-full">
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
                  <TableHead>Shift Duration</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Total visits</TableHead>
                  <TableHead>Breakdown</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Claims</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Avg visit time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r, index) => (
                  <TableRow
                    key={r.date}
                    className={getRowClassName(index, r.status, r.shiftType)}
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
                    <TableCell>
                      {r.shiftType === 'same_day'
                        ? 'Same day'
                        : r.shiftType === 'next_day_clockout'
                          ? (
                              <span className="font-medium text-destructive">
                                Next day clockout
                              </span>
                            )
                          : '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {dayMetrics[r.date]?.visitCount ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {(() => {
                        const m = dayMetrics[r.date];
                        const shiftMinutes = parseDurationToMinutes(r.attendanceRecord?.duration);
                        const totalVisit = m?.totalVisitMinutes ?? 0;
                        const driving = Math.max(0, shiftMinutes - totalVisit);
                        if (!m && driving === 0) return '—';
                        const client = m?.clientMinutes ?? 0;
                        const office = m?.officeMinutes ?? 0;
                        const parts: ReactNode[] = [];
                        if (client > 0) {
                          parts.push(
                            <span key="client" className="inline-flex items-center gap-1">
                              <Users className="size-4 shrink-0" aria-hidden />
                              {formatMinutesToDuration(client)}
                            </span>
                          );
                        }
                        if (office > 0) {
                          parts.push(
                            <span key="office" className="inline-flex items-center gap-1">
                              <Building2 className="size-4 shrink-0" aria-hidden />
                              {formatMinutesToDuration(office)}
                            </span>
                          );
                        }
                        if (driving > 0) {
                          parts.push(
                            <span key="driving" className="inline-flex items-center gap-1">
                              <Car className="size-4 shrink-0" aria-hidden />
                              {formatMinutesToDuration(driving)}
                            </span>
                          );
                        }
                        if (parts.length === 0) return '—';
                        return (
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {parts.flatMap((el, i) =>
                              i === 0 ? [el] : [<span key={`sep-${i}`} className="text-muted-foreground"> | </span>, el]
                            )}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatZAR(dayMetrics[r.date]?.totalSales ?? 0)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {dayMetrics[r.date]?.leadsCount ?? '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {dayMetrics[r.date]?.claimsCount ?? '—'}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatDistanceKm(r.attendanceRecord?.distanceTravelledKm)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {(() => {
                        const m = dayMetrics[r.date];
                        if (!m || m.visitCount === 0) return '—';
                        const avgMins = Math.round(m.totalVisitMinutes / m.visitCount);
                        return formatMinutesToDuration(avgMins);
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {!isLoading && records.length > 0 && (
          <div className="shrink-0 border-t border-border py-3 px-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
            <span>
              <span className="font-medium text-destructive">Missed:</span>{' '}
              <span className="tabular-nums font-semibold text-destructive">{summary.missed}</span>
            </span>
            <span>
              <span className="font-medium text-green-600 dark:text-green-500">Attended:</span>{' '}
              <span className="tabular-nums font-semibold text-green-600 dark:text-green-500">{summary.attended}</span>
            </span>
            <span>
              <span className="font-medium text-muted-foreground">Remaining:</span>{' '}
              <span className="tabular-nums font-semibold text-muted-foreground">{summary.remaining}</span>
            </span>
            <span>
              <span className="font-medium text-destructive">Forgotten outs:</span>{' '}
              <span className="tabular-nums font-semibold text-destructive">{summary.forgottenOuts}</span>
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
