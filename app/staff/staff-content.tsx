'use client';

import { useMemo, useState, useEffect } from 'react';
import { format, parse, subDays } from 'date-fns';
import {
  useTokenReady,
  useSessionSync,
  useMonthlyMetrics,
  useDailyOverview,
  usePayrollHoursAll,
  useIntakeInvitations,
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
import { canManageStaffUsers, isStaffDashboardVisible } from '@/lib/access';
import { fromDailyOverviewMergeMonthly } from '@/lib/utils/from-daily-overview';
import type { ReportCardUser, StatusFilter } from '@/lib/types/staff-report-types';
import {
  getExpectedHoursByDateWeekdaysOnly,
  getExpectedPayrollHoursByDate,
  HOURS_BEHIND_BADGE_THRESHOLD,
  EXPECTED_MONTHLY_HOURS,
} from '@/app/staff/lib/staff-report-constants';
import { ReportUserCard, ReportUserCardSkeleton } from '@/app/staff/components/report-user-card';
import { UserAttendanceRecordsModal } from '@/app/staff/components/user-attendance-records-modal';
import { AddUserModal } from '@/app/staff/components/add-user-modal';
import { SendIntakeLinkModal } from '@/app/staff/components/send-intake-link-modal';
import { GoogleFormIntakeModal } from '@/app/staff/components/google-form-intake-modal';
import { IntakeInvitationsPanel } from '@/app/staff/components/intake-invitations-panel';
import { Button } from '@/components/ui/button';
import { UserPlus, Link2, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [attendanceModalUser, setAttendanceModalUser] = useState<ReportCardUser | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [sendIntakeOpen, setSendIntakeOpen] = useState(false);
  const [googleFormOpen, setGoogleFormOpen] = useState(false);
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

  const canAddUser = canManageStaffUsers(profile?.accessLevel);
  const intakeQuery = useIntakeInvitations({
    enabled: mounted && isTokenReady && canAddUser,
  });
  const pendingIntakeLinks = useMemo(
    () => (intakeQuery.data?.data ?? []).filter((i) => i.status === 'pending'),
    [intakeQuery.data?.data]
  );
  const hasPendingIntakeLinks = pendingIntakeLinks.length > 0;

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
      <div className="container mx-auto max-w-8xl px-3 py-8 sm:px-6">
        <p className="text-center text-muted-foreground py-12">
          Staff management is available to staff only.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <main className="container mx-auto max-w-8xl px-3 py-8 sm:px-6 flex flex-col flex-1 min-h-0">
        <div
          className="shrink-0 mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          data-tour="staff-page-header"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              Staff
            </h1>
            <p className="text-xs text-muted-foreground mt-1 sm:text-sm">
              View and manage staff attendance and activity.
            </p>
          </div>
        </div>

        {canAddUser && (
          hasPendingIntakeLinks ? (
            <section className="shrink-0 mb-6 rounded-lg border">
              <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-medium text-foreground">User onboarding</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add staff directly or send intake links for self-service onboarding.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="success"
                    className="h-9 gap-2 !rounded px-4"
                    onClick={() => setSendIntakeOpen(true)}
                  >
                    <Link2 className="size-4" />
                    Send intake link
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 gap-2 !rounded px-4"
                    onClick={() => setGoogleFormOpen(true)}
                  >
                    <FileSpreadsheet className="size-4" />
                    Google Form
                  </Button>
                  <Button
                    className={cn(
                      'h-9 gap-2 border-0 !rounded px-4',
                      'bg-violet-600 text-white hover:bg-violet-700',
                      'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
                      '[&_svg]:text-white focus-visible:ring-violet-500/40'
                    )}
                    data-tour="staff-add-user"
                    onClick={() => setAddUserOpen(true)}
                  >
                    <UserPlus className="size-4" />
                    Add user
                  </Button>
                </div>
              </div>
              <div className="px-4 py-3">
                <h3 className="text-xs font-medium text-muted-foreground mb-2">
                  Pending intake links
                </h3>
                <IntakeInvitationsPanel />
              </div>
            </section>
          ) : (
            <div className="mb-6 flex shrink-0 justify-end gap-2">
              <Button
                variant="success"
                className="h-9 gap-2 !rounded px-4"
                onClick={() => setSendIntakeOpen(true)}
              >
                <Link2 className="size-4" />
                Send intake link
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-2 !rounded px-4"
                onClick={() => setGoogleFormOpen(true)}
              >
                <FileSpreadsheet className="size-4" />
                Google Form
              </Button>
              <Button
                className={cn(
                  'h-9 gap-2 border-0 !rounded px-4',
                  'bg-violet-600 text-white hover:bg-violet-700',
                  'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
                  '[&_svg]:text-white focus-visible:ring-violet-500/40'
                )}
                data-tour="staff-add-user"
                onClick={() => setAddUserOpen(true)}
              >
                <UserPlus className="size-4" />
                Add user
              </Button>
            </div>
          )
        )}

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

      <UserAttendanceRecordsModal
        user={attendanceModalUser}
        onClose={() => setAttendanceModalUser(null)}
      />

      <AddUserModal open={addUserOpen} onOpenChange={setAddUserOpen} />
      <SendIntakeLinkModal open={sendIntakeOpen} onOpenChange={setSendIntakeOpen} />
      <GoogleFormIntakeModal open={googleFormOpen} onOpenChange={setGoogleFormOpen} />
    </div>
  );
}
