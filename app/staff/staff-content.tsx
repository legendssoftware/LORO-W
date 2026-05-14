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
import { StaffFiltersBar } from '@/app/staff/components/staff-filters-bar';
import {
  STAFF_DIMENSION_FILTER_ALL,
  buildStaffRoleFilterItems,
  buildStaffBranchFilterItems,
  buildStaffWorkforceFilterItems,
  staffUserMatchesRoleFilter,
  staffUserMatchesBranchFilter,
  staffUserMatchesWorkforceFilter,
} from '@/lib/staff-filter-utils';
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

export function StaffContent() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const today = new Date();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState(STAFF_DIMENSION_FILTER_ALL);
  const [workforceFilter, setWorkforceFilter] = useState(STAFF_DIMENSION_FILTER_ALL);
  const [branchFilter, setBranchFilter] = useState(STAFF_DIMENSION_FILTER_ALL);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<ReportCardUser | null>(null);
  const [attendanceModalUser, setAttendanceModalUser] = useState<ReportCardUser | null>(null);
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
    if (statusFilter === 'sales_warning_1') {
      return cardUsersWithPayroll.filter((u) => u.targetWarnings?.level === 1);
    }
    if (statusFilter === 'sales_warning_2') {
      return cardUsersWithPayroll.filter((u) => u.targetWarnings?.level === 2);
    }
    if (statusFilter === 'sales_warning_3') {
      return cardUsersWithPayroll.filter((u) => u.targetWarnings?.level === 3);
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

  const roleFilterItems = useMemo(
    () => buildStaffRoleFilterItems(statusFilteredUsers),
    [statusFilteredUsers]
  );
  const branchFilterItems = useMemo(
    () => buildStaffBranchFilterItems(statusFilteredUsers),
    [statusFilteredUsers]
  );
  const workforceFilterItems = useMemo(
    () => buildStaffWorkforceFilterItems(statusFilteredUsers),
    [statusFilteredUsers]
  );

  useEffect(() => {
    const valid = roleFilterItems.some((i) => i.value === roleFilter);
    if (!valid) setRoleFilter(STAFF_DIMENSION_FILTER_ALL);
  }, [roleFilterItems, roleFilter]);

  useEffect(() => {
    const valid = branchFilterItems.some((i) => i.value === branchFilter);
    if (!valid) setBranchFilter(STAFF_DIMENSION_FILTER_ALL);
  }, [branchFilterItems, branchFilter]);

  useEffect(() => {
    const valid = workforceFilterItems.some((i) => i.value === workforceFilter);
    if (!valid) setWorkforceFilter(STAFF_DIMENSION_FILTER_ALL);
  }, [workforceFilterItems, workforceFilter]);

  const dimensionFilteredUsers = useMemo(() => {
    return statusFilteredUsers.filter(
      (u) =>
        staffUserMatchesRoleFilter(u, roleFilter) &&
        staffUserMatchesWorkforceFilter(u, workforceFilter) &&
        staffUserMatchesBranchFilter(u, branchFilter)
    );
  }, [statusFilteredUsers, roleFilter, workforceFilter, branchFilter]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dimensionFilteredUsers;
    return dimensionFilteredUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q))
    );
  }, [dimensionFilteredUsers, search]);

  const branchFilterTriggerLabel = useMemo(
    () => branchFilterItems.find((i) => i.value === branchFilter)?.label ?? 'All branches',
    [branchFilterItems, branchFilter]
  );

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
        <div className="shrink-0 mb-6" data-tour="staff-page-header">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            Staff
          </h1>
          <p className="text-xs text-muted-foreground mt-1 sm:text-sm">
            View and manage staff attendance and activity.
          </p>
        </div>

        <StaffFiltersBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          roleFilterItems={roleFilterItems}
          workforceFilter={workforceFilter}
          onWorkforceFilterChange={setWorkforceFilter}
          workforceFilterItems={workforceFilterItems}
          branchFilter={branchFilter}
          onBranchFilterChange={setBranchFilter}
          branchFilterItems={branchFilterItems}
          branchFilterTriggerLabel={branchFilterTriggerLabel}
          branchPickerOpen={branchPickerOpen}
          onBranchPickerOpenChange={setBranchPickerOpen}
        />

        <div className="flex-1 min-h-0 overflow-y-auto" data-tour="staff-grid">
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

    </div>
  );
}
