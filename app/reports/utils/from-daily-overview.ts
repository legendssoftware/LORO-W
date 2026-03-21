import type { DailyOverviewUser, MonthlyMetricsUserItem } from '@/api/types';
import type { ReportCardUser } from '@/app/reports/types';
import {
  EXPECTED_MONTHLY_HOURS,
  getExpectedMonthlyHoursWeekdaysOnly,
} from '@/app/reports/tabs/constants';

/** Month context for five-day work week expected hours (year, month 1–12). When provided, progress uses weekday-based expected. */
export type MonthContext = { year: number; month: number };

/**
 * Merges daily overview (present/absent users) with monthly metrics to produce ReportCardUser[].
 * When monthContext is provided, expected hours and progress % use a five-day work week (Mon–Fri only).
 */
export function fromDailyOverviewMergeMonthly(
  presentUsers: DailyOverviewUser[],
  absentUsers: DailyOverviewUser[],
  monthlyByUserId: Map<number, MonthlyMetricsUserItem>,
  monthContext?: MonthContext
): ReportCardUser[] {
  const expectedMonthly = monthContext
    ? getExpectedMonthlyHoursWeekdaysOnly(monthContext.year, monthContext.month)
    : EXPECTED_MONTHLY_HOURS;

  const toCard = (u: DailyOverviewUser, present: boolean): ReportCardUser => {
    const monthly = monthlyByUserId.get(u.uid);
    const hours = monthly?.totalHours ?? 0;
    const progress = Math.min(
      100,
      Math.round((hours / expectedMonthly) * 100)
    );
    return {
      userId: u.uid,
      ref: String(u.uid),
      name: u.fullName || `${u.name || ''} ${u.surname || ''}`.trim(),
      email: u.email ?? '',
      phone: u.phoneNumber ?? undefined,
      role: u.role ?? u.accessLevel,
      branch: u.branchName,
      photoURL: u.profileImage ?? undefined,
      hoursThisMonth: hours,
      progressPercent: progress,
      isPresent: present,
      earlyMinutes: present ? (u.earlyMinutes ?? 0) : undefined,
      lateMinutes: present ? (u.lateMinutes ?? 0) : undefined,
      shiftStartAddress: present ? (u.shiftStartAddress ?? null) : null,
      accessLevel: u.accessLevel ?? null,
      checkInTime: present ? (u.checkInTime ?? null) : null,
      checkOutTime: present ? (u.checkOutTime ?? null) : null,
      workingHours: present ? (u.workingHours ?? null) : null,
      shiftDuration: present ? (u.shiftDuration ?? null) : null,
      isOnBreak: present ? (u.isOnBreak ?? false) : undefined,
      attendanceStatus: present ? (u.status ?? null) : null,
      lastSeenDate: !present ? (u.lastSeenDate ?? null) : null,
      employeeSince: u.employeeSince ?? null,
      isActive: u.isActive ?? undefined,
      totalShifts: monthly?.totalShifts ?? undefined,
      overtimeHours: monthly?.overtimeHours ?? undefined,
      firstAttendanceInPeriod: u.firstAttendanceInPeriod ?? null,
      lastAttendanceInPeriod: u.lastAttendanceInPeriod ?? null,
      lastAppAccessAt: u.lastAppAccessAt ?? null,
      lastAppAccessDeviceType: u.lastAppAccessDeviceType ?? null,
      distanceFromWorkplaceMeters: present ? (u.distanceFromWorkplaceMeters ?? null) : undefined,
      hrID: u.hrID ?? null,
      checkInNotes: present ? (u.checkInNotes ?? null) : null,
      last7Days: monthly?.last7Days,
    };
  };
  const presentCards = presentUsers.map((u) => toCard(u, true));
  const absentCards = absentUsers.map((u) => toCard(u, false));
  return [...presentCards, ...absentCards];
}
