'use client';

import { useMemo, useState, useEffect } from 'react';
import { format, parse, subDays } from 'date-fns';
import {
  useTokenReady,
  useSessionSync,
  useMonthlyMetrics,
  useDailyOverview,
  usePayrollHoursAll,
} from '@/api/hooks';
import type { MonthlyMetricsUserItem } from '@/api/types';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { XIcon } from '@/lib/icons';
import { STAFF_STATUS_FILTER_OPTIONS } from '@/lib/staff-filter-utils';
import { clockInModeKeyForFilter } from '@/lib/clock-in-options';
import { isStaffDashboardVisible } from '@/lib/access';
import { fromDailyOverviewMergeMonthly } from '@/app/reports/utils/from-daily-overview';
import type { ReportCardUser, StatusFilter } from '@/app/reports/types';
import {
  getExpectedHoursByDateWeekdaysOnly,
  getExpectedPayrollHoursByDate,
  HOURS_BEHIND_BADGE_THRESHOLD,
  EXPECTED_MONTHLY_HOURS,
} from '@/app/reports/tabs/constants';
import { ReportUserCard, ReportUserCardSkeleton } from '@/app/reports/components/report-user-card';
import { ReportUserDetailModal } from '@/app/reports/components/report-user-detail-modal';
import { UserAttendanceRecordsModal } from '@/app/reports/components/user-attendance-records-modal';
import { PayrollSummaryDialog } from '@/app/reports/components/payroll-summary-dialog';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StaffContent() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const today = new Date();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [detailUser, setDetailUser] = useState<ReportCardUser | null>(null);
  const [attendanceModalUser, setAttendanceModalUser] = useState<ReportCardUser | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const singleDateStr = format(today, 'yyyy-MM-dd');
  const monthForSingle = today.getMonth() + 1;
  const yearForSingle = today.getFullYear();

  const monthlyQuery = useMonthlyMetrics(
    { year: yearForSingle, month: monthForSingle, includeCheckIns: false },
    { enabled: mounted && isTokenReady }
  );

  const dailyQuery = useDailyOverview(
    { date: singleDateStr },
    { enabled: mounted && isTokenReady }
  );

  const payrollQuery = usePayrollHoursAll(
    {},
    { enabled: mounted && isTokenReady }
  );

  const monthlyByUserId = useMemo(() => {
    const map = new Map<number, MonthlyMetricsUserItem>();
    const list = monthlyQuery.data?.data?.userMetrics ?? [];
    list.forEach((u: MonthlyMetricsUserItem) => map.set(u.userId, u));
    return map as Map<number, MonthlyMetricsUserItem>;
  }, [monthlyQuery.data]);

  const cardUsers = useMemo((): ReportCardUser[] => {
    if (!singleDateStr || !dailyQuery.data?.data) return [];
    return fromDailyOverviewMergeMonthly(
      dailyQuery.data.data.presentUsers,
      dailyQuery.data.data.absentUsers,
      monthlyByUserId,
      { year: yearForSingle, month: monthForSingle }
    );
  }, [singleDateStr, dailyQuery.data, monthlyByUserId, yearForSingle, monthForSingle]);

  const cardUsersWithPayroll = useMemo((): ReportCardUser[] => {
    const payroll = payrollQuery.data;
    if (!payroll?.period?.startDate || !payroll?.period?.endDate) return cardUsers;
    const periodStart = new Date(payroll.period.startDate);
    const periodEnd = new Date(payroll.period.endDate);
    const payrollTargetHours = EXPECTED_MONTHLY_HOURS;
    const payrollExpectedByNow = getExpectedPayrollHoursByDate(periodStart, periodEnd, today);
    const payrollByUserId = new Map<number, number>();
    (payroll.userMetrics ?? []).forEach((m: { userId: number; payrollHours: number }) =>
      payrollByUserId.set(m.userId, m.payrollHours)
    );
    return cardUsers.map((u) => {
      const payrollHours = payrollByUserId.get(u.userId);
      if (payrollHours == null) return u;
      const payrollProgressPercent = Math.min(
        100,
        Math.round((payrollHours / payrollTargetHours) * 100)
      );
      return {
        ...u,
        payrollHours,
        payrollTargetHours,
        payrollExpectedByNow,
        payrollProgressPercent,
      };
    });
  }, [cardUsers, payrollQuery.data, today.getTime()]);

  const branchLocationRadiusMeters =
    dailyQuery.data?.data?.branchLocationRadiusMeters ?? 50;

  const statusFilteredUsers = useMemo(() => {
    if (statusFilter === 'all') return cardUsersWithPayroll;
    if (statusFilter === 'present') return cardUsersWithPayroll.filter((u) => u.isPresent);
    if (statusFilter === 'absent') return cardUsersWithPayroll.filter((u) => !u.isPresent);
    if (statusFilter === 'late') return cardUsersWithPayroll.filter((u) => u.isPresent && (u.lateMinutes != null && u.lateMinutes > 0));
    if (statusFilter === 'early') return cardUsersWithPayroll.filter((u) => u.isPresent && (u.earlyMinutes != null && u.earlyMinutes > 0));
    if (statusFilter === 'behind_on_hours') {
      return cardUsersWithPayroll.filter((u) => {
        if (u.payrollExpectedByNow != null && u.payrollHours != null) {
          return (u.payrollExpectedByNow - u.payrollHours) > HOURS_BEHIND_BADGE_THRESHOLD;
        }
        const expectedByNow = getExpectedHoursByDateWeekdaysOnly(today);
        return (expectedByNow - u.hoursThisMonth) > HOURS_BEHIND_BADGE_THRESHOLD;
      });
    }
    if (statusFilter === 'idle') {
      const sevenDaysAgo = subDays(today, 7);
      return cardUsersWithPayroll.filter((u) => {
        if (!u.lastAppAccessAt) return true;
        try {
          const lastAt = parse(u.lastAppAccessAt, 'MMM d, yyyy h:mm a', new Date());
          return lastAt < sevenDaysAgo;
        } catch {
          return true;
        }
      });
    }
    if (
      statusFilter === 'at_office' ||
      statusFilter === 'work_from_home' ||
      statusFilter === 'starting_from_home' ||
      statusFilter === 'offsite' ||
      statusFilter === 'driving'
    ) {
      return cardUsersWithPayroll.filter(
        (u) =>
          clockInModeKeyForFilter(
            u.isPresent,
            u.checkInNotes,
            u.distanceFromWorkplaceMeters,
            branchLocationRadiusMeters
          ) === statusFilter
      );
    }
    return cardUsersWithPayroll;
  }, [
    cardUsersWithPayroll,
    statusFilter,
    today.getTime(),
    branchLocationRadiusMeters,
  ]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return statusFilteredUsers;
    return statusFilteredUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q))
    );
  }, [statusFilteredUsers, search]);

  const isStaff = isStaffDashboardVisible(profile?.accessLevel);
  const isLoading =
    (!!singleDateStr && dailyQuery.isLoading) || monthlyQuery.isLoading;

  if (!mounted || !isTokenReady) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  if (profile && !isStaff) {
    return (
      <div className="container mx-auto max-w-6xl lg:max-w-[88rem] px-3 py-8 sm:px-6">
        <p className="text-center text-muted-foreground py-12">
          Staff management is available to staff only.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <main className="container mx-auto max-w-6xl lg:max-w-[88rem] px-3 py-8 sm:px-6 flex flex-col flex-1 min-h-0">
        <div className="shrink-0 mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            Staff
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage staff attendance and activity.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 shrink-0 mb-4">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="h-9 min-w-0 w-full sm:min-w-[140px] sm:w-[140px] bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_STATUS_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <opt.icon className="size-4 shrink-0" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="shrink-0 rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto h-9 w-9 flex items-center justify-center"
                  aria-label="Clear status filter"
                >
                  <XIcon className="size-4 text-muted-foreground" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0 w-full sm:w-auto">
            <div className="relative w-full min-w-0 flex-1 sm:flex-initial sm:w-56 sm:max-w-[16rem]">
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  'w-full bg-white border-gray-200 text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0 h-9',
                  search && 'pr-8'
                )}
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground"
                  aria-label="Clear search"
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 bg-white border-gray-200 text-foreground"
              onClick={() => setSummaryOpen(true)}
            >
              <BarChart3 className="size-4 shrink-0" />
              Summary
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <ReportUserCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {filteredUsers.map((user) => (
                <ReportUserCard
                  key={user.userId}
                  user={user}
                  endDate={today}
                  branchLocationRadiusMeters={
                    dailyQuery.data?.data?.branchLocationRadiusMeters ?? 50
                  }
                  onClick={() => setDetailUser(user)}
                  onSettingsClick={(e) => {
                    e.stopPropagation();
                  }}
                  onClockClick={(e) => {
                    e.stopPropagation();
                    setAttendanceModalUser(user);
                  }}
                />
              ))}
            </div>
          )}
          {!isLoading && filteredUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No staff to show. Ensure you have access.
            </p>
          )}
        </div>
      </main>

      <ReportUserDetailModal
        user={detailUser}
        endDate={today}
        onClose={() => setDetailUser(null)}
      />

      <UserAttendanceRecordsModal
        user={attendanceModalUser}
        onClose={() => setAttendanceModalUser(null)}
      />

      <PayrollSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        payrollData={payrollQuery.data}
        payrollIsLoading={payrollQuery.isLoading}
        monthlyByUserId={monthlyByUserId}
        presentUsers={dailyQuery.data?.data?.presentUsers ?? []}
        absentUsers={dailyQuery.data?.data?.absentUsers ?? []}
        yearForMetrics={yearForSingle}
        monthForMetrics={monthForSingle}
      />
    </div>
  );
}
