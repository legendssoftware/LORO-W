import { startOfWeek, addDays, format, startOfDay } from 'date-fns';

/** Minimal attendance record for streak calculation (from API checkIns or metrics) */
export interface AttendanceRecordForStreak {
  checkIn?: string | null;
  status?: string;
}

export interface WeekDay {
  date: string | Date;
  dayLabel: string;
  status: 'attended' | 'missed' | 'future';
}

export interface AttendanceStreakData {
  streak: number;
  weekDays: WeekDay[];
}

/**
 * Get current week days (Monday to Saturday).
 * Returns array of dates for Mon–Sat of current week.
 */
export function getCurrentWeekDays(): Date[] {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays: Date[] = [];
  for (let i = 0; i < 6; i++) {
    weekDays.push(addDays(weekStart, i));
  }
  return weekDays;
}

/**
 * Check if a date falls within the current week (Mon–Sat).
 */
export function isDateInWeek(date: Date, weekDays: Date[]): boolean {
  if (weekDays.length === 0) return false;
  const dateStart = startOfDay(date);
  const weekStart = startOfDay(weekDays[0]!);
  const weekEnd = startOfDay(weekDays[weekDays.length - 1]!);
  return dateStart >= weekStart && dateStart <= weekEnd;
}

/**
 * Calculate attendance streak and week status.
 * @param attendanceRecords - Array of attendance records (e.g. from GET /att/user/me checkIns)
 * @returns Object with streak count and week days with status (attended / missed / future)
 */
export function calculateAttendanceStreak(
  attendanceRecords: AttendanceRecordForStreak[]
): AttendanceStreakData {
  const weekDays = getCurrentWeekDays();
  const today = startOfDay(new Date());
  const weekStart = startOfDay(weekDays[0]!);
  const weekEnd = startOfDay(weekDays[weekDays.length - 1]!);

  const currentWeekRecords = attendanceRecords.filter((record) => {
    if (!record.checkIn) return false;
    const checkInDate = startOfDay(new Date(record.checkIn));
    return checkInDate >= weekStart && checkInDate <= weekEnd;
  });

  const daysWithRecords = new Set<string>();
  currentWeekRecords.forEach((record) => {
    if (!record.checkIn) return;
    const checkInDate = startOfDay(new Date(record.checkIn));
    const dateKey = format(checkInDate, 'yyyy-MM-dd');
    const status = (record.status ?? '').toUpperCase();
    const isAttended =
      status === 'PRESENT' || status === 'COMPLETED' || status === 'ON_BREAK';
    if (isAttended) daysWithRecords.add(dateKey);
  });

  const weekDaysWithStatus: WeekDay[] = weekDays.map((date) => {
    const dayLabel = format(date, 'EEE').substring(0, 2);
    const dateStart = startOfDay(date);
    const dateKey = format(dateStart, 'yyyy-MM-dd');
    if (dateStart > today) {
      return { date, dayLabel, status: 'future' as const };
    }
    const attended = daysWithRecords.has(dateKey);
    return {
      date,
      dayLabel,
      status: (attended ? 'attended' : 'missed') as 'attended' | 'missed',
    };
  });

  return {
    streak: daysWithRecords.size,
    weekDays: weekDaysWithStatus,
  };
}
