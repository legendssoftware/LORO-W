'use client';

import { useState, useMemo } from 'react';
import { CheckIcon, XIcon } from '@/lib/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMonthlyAttendance } from '@/api/hooks';
import type { MonthlyAttendanceDay } from '@/api/types';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Column index when week starts Monday (0=Mon, 6=Sun). Server dayOfWeek: 0=Sun, 1=Mon, ... */
function colIndex(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

export interface AttendanceStreakCalendarProps {
  /** User ref (profile.uid) - required to show calendar */
  userRef?: number | null;
}

export function AttendanceStreakCalendar({ userRef }: AttendanceStreakCalendarProps) {
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useMonthlyAttendance(
    userRef ?? null,
    selectedYear,
    selectedMonth,
    { enabled: userRef != null }
  );

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
  }, [now]);

  const valueKey = `${selectedYear}-${selectedMonth}`;

  if (userRef == null) return null;

  const getDayBg = (day: MonthlyAttendanceDay) => {
    if (day.status === 'attended') return 'bg-emerald-500';
    if (day.status === 'missed') {
      const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
      return isWeekend ? 'bg-gray-300' : 'bg-orange-500';
    }
    return 'bg-gray-200';
  };

  const getDayIcon = (day: MonthlyAttendanceDay) => {
    if (day.status === 'attended')
      return <CheckIcon className="size-3.5 text-white shrink-0" aria-hidden />;
    return <XIcon className="size-3.5 text-white shrink-0" aria-hidden />;
  };

  return (
    <div className="rounded border border-gray-200 bg-card p-4">
      {isLoading ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-6 w-28 rounded-md" />
            <Skeleton className="h-9 w-[140px] rounded border border-gray-200" />
          </div>
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
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-gray-200 pt-4">
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Attendance</h2>
            <Select
              value={valueKey}
              onValueChange={(v) => {
                const [y, m] = v.split('-').map(Number);
                setSelectedYear(y);
                setSelectedMonth(m);
              }}
            >
              <SelectTrigger className="h-9 w-[140px] rounded border border-gray-200 bg-background">
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
          {!data?.days?.length ? (
            <div className="flex min-h-[200px] items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No attendance data for this month.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-full lg:max-w-[50%]">
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
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-gray-200 pt-4 text-xs text-muted-foreground">
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
