'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { CheckIcon, XIcon } from '@/lib/icons';
import { CalendarOff } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMonthlyAttendance } from '@/api/hooks';
import type { MonthlyAttendanceDay } from '@/api/types';
import {
  EXPECTED_HOURS_PER_DAY,
  workingDaysInMonth,
} from '@/app/staff/lib/staff-report-constants';
import { formatMinutesToDuration, parseDurationToMinutes } from '@/lib/duration';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Column index when week starts Monday (0=Mon, 6=Sun). Server dayOfWeek: 0=Sun, 1=Mon, ... */
function colIndex(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

/** Monday–Friday. Server dayOfWeek: 0=Sun … 6=Sat. */
function isWeekday(dayOfWeek: number): boolean {
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

interface MonthHoursSummary {
  workedMinutes: number;
  attended: number;
  missed: number;
  remainingMinutes: number;
}

interface PayrollWindow {
  start: string;
  end: string;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Payroll cycle used across the app: the 26th through the 25th.
 * On or before the 25th the window is last month’s 26th to this month’s 25th.
 */
function payrollWindow(reference: Date): PayrollWindow {
  const year = reference.getFullYear();
  const monthIndex = reference.getMonth();
  const day = reference.getDate();
  const start = day <= 25 ? new Date(year, monthIndex - 1, 26) : new Date(year, monthIndex, 26);
  const end = day <= 25 ? new Date(year, monthIndex, 25) : new Date(year, monthIndex + 1, 25);
  return {
    start: dateKey(start),
    end: dateKey(end),
    startYear: start.getFullYear(),
    startMonth: start.getMonth() + 1,
    endYear: end.getFullYear(),
    endMonth: end.getMonth() + 1,
  };
}

function payrollWindowForSelection(year: number, month: number, now: Date): PayrollWindow {
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const reference = isCurrentMonth ? now : new Date(year, month, 0);
  return payrollWindow(reference);
}

/** Shift minutes inside the payroll window. Days outside the window are ignored. */
function payrollWorkedMinutes(window: PayrollWindow, batches: MonthlyAttendanceDay[][]): number {
  const seen = new Set<string>();
  let minutes = 0;
  for (const days of batches) {
    for (const day of days) {
      if (day.date < window.start || day.date > window.end || seen.has(day.date)) continue;
      seen.add(day.date);
      if (day.status !== 'attended') continue;
      minutes += parseDurationToMinutes(day.attendanceRecord?.duration);
    }
  }
  return minutes;
}

/**
 * Hours and day counts for the selected calendar month.
 * Missed counts weekdays only so it matches the orange cells.
 * Remaining is the shortfall against weekday hours (8h × Mon–Fri).
 */
function summarizeMonth(
  days: MonthlyAttendanceDay[],
  year: number,
  month: number
): MonthHoursSummary {
  let workedMinutes = 0;
  let attended = 0;
  let missed = 0;

  for (const day of days) {
    if (day.status === 'attended') {
      attended += 1;
      workedMinutes += parseDurationToMinutes(day.attendanceRecord?.duration);
      continue;
    }
    if (day.status === 'missed' && isWeekday(day.dayOfWeek)) {
      missed += 1;
    }
  }

  const expectedMinutes = workingDaysInMonth(year, month) * EXPECTED_HOURS_PER_DAY * 60;
  const remainingMinutes = Math.max(0, expectedMinutes - workedMinutes);

  return { workedMinutes, attended, missed, remainingMinutes };
}

function MonthHoursHighlightCards({
  summary,
  payrollMinutes,
}: {
  summary: MonthHoursSummary;
  payrollMinutes: number | null;
}) {
  const cards: Array<{ label: string; value: string; hint: string; valueClassName: string }> = [
    {
      label: 'Missed',
      value: String(summary.missed),
      hint: 'Weekdays with no shift',
      valueClassName: 'text-destructive',
    },
    {
      label: 'Attended',
      value: String(summary.attended),
      hint: 'Days you clocked in',
      valueClassName: 'text-green-600 dark:text-green-500',
    },
    {
      label: 'Remaining',
      value: formatMinutesToDuration(summary.remainingMinutes),
      hint: 'Hours still short this month',
      valueClassName: 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Card className="gap-1 rounded border border-border py-3 shadow-none sm:py-3">
        <CardContent className="px-3 sm:px-4">
          <p className="text-xs font-medium text-muted-foreground">Hours</p>
          <div className="mt-2 space-y-2">
            <div>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {formatMinutesToDuration(summary.workedMinutes)}
              </p>
              <p className="text-[11px] leading-snug text-muted-foreground">This month. Calendar month.</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {payrollMinutes == null ? '—' : formatMinutesToDuration(payrollMinutes)}
              </p>
              <p className="text-[11px] leading-snug text-muted-foreground">This payroll. 26th to the 25th.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {cards.map((card) => (
        <Card key={card.label} className="gap-1 rounded border border-border py-3 shadow-none sm:py-3">
          <CardContent className="px-3 sm:px-4">
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            <p className={cn('mt-1 text-lg font-semibold tabular-nums', card.valueClassName)}>{card.value}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{card.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MonthHoursHighlightSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded border border-border" />
      ))}
    </div>
  );
}

export interface AttendanceMonthHighlightsProps {
  userRef?: number | string | null;
  year: number;
  month: number;
}

function sameMonth(left: number | undefined, right: number): boolean {
  return left != null && Number(left) === Number(right);
}

/** Four highlight cards for the month selected in the attendance calendar. */
export function AttendanceMonthHighlights({ userRef, year, month }: AttendanceMonthHighlightsProps) {
  const query = useMonthlyAttendance(userRef ?? null, year, month, {
    enabled: userRef != null,
  });
  const payroll = useMemo(
    () => payrollWindowForSelection(year, month, new Date()),
    [year, month]
  );
  const payrollStartQuery = useMonthlyAttendance(userRef ?? null, payroll.startYear, payroll.startMonth, {
    enabled: userRef != null,
  });
  const payrollSpansTwoMonths =
    payroll.endYear !== payroll.startYear || payroll.endMonth !== payroll.startMonth;
  const payrollEndQuery = useMonthlyAttendance(userRef ?? null, payroll.endYear, payroll.endMonth, {
    enabled: userRef != null && payrollSpansTwoMonths,
  });
  const { data, isLoading, isError, status, fetchStatus } = query;
  const monthMatchesFilter =
    data != null && sameMonth(data.year, year) && sameMonth(data.month, month);
  const summary = useMemo(() => {
    if (!data?.days?.length) return null;
    return summarizeMonth(data.days, Number(data.year), Number(data.month));
  }, [data]);
  const payrollReady =
    payrollStartQuery.data != null && (!payrollSpansTwoMonths || payrollEndQuery.data != null);
  const payrollMinutes = useMemo(() => {
    if (!payrollReady) return null;
    return payrollWorkedMinutes(payroll, [
      payrollStartQuery.data?.days ?? [],
      payrollSpansTwoMonths ? payrollEndQuery.data?.days ?? [] : [],
    ]);
  }, [payrollReady, payroll, payrollStartQuery.data?.days, payrollSpansTwoMonths, payrollEndQuery.data?.days]);

  useEffect(() => {
    console.log('[attendance-month] highlights', {
      userRef,
      year,
      month,
      status,
      fetchStatus,
      isLoading,
      isError,
      error: query.error instanceof Error ? query.error.message : null,
      responseYear: data?.year ?? null,
      responseMonth: data?.month ?? null,
      days: data?.days?.length ?? null,
      monthMatchesFilter,
      payrollStart: payroll.start,
      payrollEnd: payroll.end,
      payrollMinutes,
      showing: isLoading && data == null ? 'skeleton' : summary ? 'cards' : 'empty',
    });
  }, [
    userRef,
    year,
    month,
    status,
    fetchStatus,
    isLoading,
    isError,
    query.error,
    data,
    monthMatchesFilter,
    summary,
    payroll.start,
    payroll.end,
    payrollMinutes,
  ]);

  if (userRef == null) return null;
  if (isLoading && data == null) return <MonthHoursHighlightSkeleton />;
  if (!summary) return null;
  return <MonthHoursHighlightCards summary={summary} payrollMinutes={payrollMinutes} />;
}

export interface AttendanceStreakCalendarProps {
  /** User ref (numeric uid or Clerk user id) — server resolves both */
  userRef?: number | string | null;
  /** Optional content rendered in the header row to the right of the month selector (e.g. Logs button). */
  headerTrailing?: React.ReactNode;
  year: number;
  month: number;
  onPeriodChange: (year: number, month: number) => void;
}

export function AttendanceStreakCalendar({
  userRef,
  headerTrailing,
  year,
  month,
  onPeriodChange,
}: AttendanceStreakCalendarProps) {
  const [calendarNow, setCalendarNow] = useState(() => new Date());
  const didSyncClientDate = useRef(false);

  useEffect(() => {
    if (didSyncClientDate.current) return;
    didSyncClientDate.current = true;
    setCalendarNow(new Date());
  }, []);

  const now = calendarNow;

  const query = useMonthlyAttendance(userRef ?? null, year, month, {
    enabled: userRef != null,
  });
  const { data, isLoading, isError, status, fetchStatus } = query;

  const monthOptions = useMemo(() => {
    const opts: { label: string; year: number; month: number }[] = [];
    for (let i = -2; i <= 0; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      opts.push({
        label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
        year: d.getFullYear(),
        month: d.getMonth() + 1,
      });
    }
    return opts.reverse();
  }, [now.getTime()]);

  const valueKey = `${year}-${month}`;

  const monthMatchesFilter =
    data != null && sameMonth(data.year, year) && sameMonth(data.month, month);
  const waitingForDays = isLoading && data == null;

  useEffect(() => {
    console.log('[attendance-month] calendar', {
      userRef,
      year,
      month,
      status,
      fetchStatus,
      isLoading,
      isError,
      error: query.error instanceof Error ? query.error.message : null,
      responseYear: data?.year ?? null,
      responseMonth: data?.month ?? null,
      days: data?.days?.length ?? null,
      monthMatchesFilter,
      showing: waitingForDays ? 'skeleton' : data?.days?.length ? 'calendar' : 'empty',
    });
  }, [
    userRef,
    year,
    month,
    status,
    fetchStatus,
    isLoading,
    isError,
    query.error,
    data,
    monthMatchesFilter,
    waitingForDays,
  ]);

  if (userRef == null) return null;

  const getDayBg = (day: MonthlyAttendanceDay) => {
    if (day.status === 'attended') return 'bg-emerald-500';
    if (day.status === 'missed') {
      const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
      return isWeekend ? 'bg-gray-300' : 'bg-orange-500';
    }
    return 'bg-gray-200';
  };

  const dayIconClass =
    'size-3.5 shrink-0 text-white hidden md:block';

  const getDayIcon = (day: MonthlyAttendanceDay) => {
    if (day.status === 'attended')
      return <CheckIcon className={dayIconClass} aria-hidden />;
    return <XIcon className={dayIconClass} aria-hidden />;
  };

  return (
    <div
      className="rounded border border-border bg-card p-4"
      data-tour="attendance-section"
    >
      <div className="mb-4 flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Attendance</h2>
            <div className="flex w-full items-stretch gap-2">
              <div
                className={cn(
                  'min-w-0 md:w-[140px] md:flex-none md:shrink-0',
                  headerTrailing != null ? 'flex-1 basis-0' : 'flex-1'
                )}
                data-tour="attendance-month-selector"
              >
                <Select
                  value={valueKey}
                  onValueChange={(v) => {
                    const [y, m] = v.split('-').map(Number);
                    onPeriodChange(y, m);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded border border-border bg-background">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((opt) => {
                      const k = `${opt.year}-${opt.month}`;
                      return (
                        <SelectItem key={k} value={k}>
                          {opt.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {headerTrailing != null ? (
                <div className="min-w-0 flex-1 basis-0 md:w-auto md:flex-none md:shrink-0 [&_button]:w-full md:[&_button]:w-auto">
                  {headerTrailing}
                </div>
              ) : null}
            </div>
          </div>
      {waitingForDays ? (
        <>
          <div className="mx-auto max-w-full lg:max-w-[50%]">
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="mx-auto h-3 w-8 rounded-md" />
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-full" />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-border pt-4">
              {[1, 2, 3].map((i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <Skeleton className="size-4 shrink-0 rounded-full" />
                  <Skeleton className="h-3 w-14 rounded-md" />
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {isError || !data?.days?.length ? (
            <div className="flex min-h-[200px] items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No attendance data for this month.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-full lg:max-w-[50%]" data-tour="monthly-attendance-list">
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}
                {(() => {
                  const firstDay = data.days[0];
                  const leadingEmpty = firstDay
                    ? colIndex(firstDay.dayOfWeek)
                    : 0;
                  const cells: React.ReactNode[] = [];
                  for (let i = 0; i < leadingEmpty; i++) {
                    cells.push(<div key={`empty-${i}`} className="aspect-square" />);
                  }
                  data.days.forEach((day) => {
                    cells.push(
                      <div
                        key={day.date}
                        className={cn(
                          'flex aspect-square flex-col items-center justify-center gap-0 rounded-full',
                          getDayBg(day),
                          day.status === 'future' && 'opacity-50'
                        )}
                      >
                        <span
                          className={cn(
                            'text-[13px] font-semibold leading-none drop-shadow-sm',
                            day.status === 'future' ? 'text-black' : 'text-white'
                          )}
                        >
                          {day.dayNumber}
                        </span>
                        {getDayIcon(day)}
                      </div>
                    );
                  });
                  return cells;
                })()}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-4 rounded-full bg-emerald-500" />
                  Attended
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-4 rounded-full bg-orange-500" />
                  Missed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-4 rounded-full bg-gray-200" />
                  Future
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
