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
import { isStaffDashboardVisible } from '@/lib/access';
import { fromDailyOverviewMergeMonthly } from '@/app/reports/utils/from-daily-overview';
import type { ReportCardUser, StatusFilter } from '@/app/reports/types';
import {
  getExpectedHoursByDateWeekdaysOnly,
  getExpectedPayrollHoursByDate,
  HOURS_BEHIND_BADGE_THRESHOLD,
  EXPECTED_HOURS_PER_DAY,
  workingDaysInPeriod,
} from '@/app/reports/tabs/constants';
import { ReportUserCard, ReportUserCardSkeleton } from '@/app/reports/components/report-user-card';
import { ReportUserDetailModal } from '@/app/reports/components/report-user-detail-modal';
import { UserAttendanceRecordsModal } from '@/app/reports/components/user-attendance-records-modal';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    const payrollTargetHours = workingDaysInPeriod(periodStart, periodEnd) * EXPECTED_HOURS_PER_DAY;
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

  const cardUsersByUserId = useMemo(() => {
    const map = new Map<number, ReportCardUser>();
    cardUsersWithPayroll.forEach((u) => map.set(u.userId, u));
    return map;
  }, [cardUsersWithPayroll]);

  const payrollTableRows = useMemo(() => {
    const metrics = payrollQuery.data?.userMetrics ?? [];
    return metrics.map((m) => {
      const card = cardUsersByUserId.get(m.userId);
      const monthly = monthlyByUserId.get(m.userId);
      return {
        userId: m.userId,
        name: card?.name ?? m.userName,
        photoURL: card?.photoURL ?? undefined,
        email: card?.email ?? null,
        phone: card?.phone ?? null,
        branch: card?.branch ?? null,
        role: card?.role ?? null,
        empCode: card?.hrID ?? null,
        payrollHours: m.payrollHours,
        totalHours: monthly?.totalHours ?? null,
      };
    });
  }, [payrollQuery.data?.userMetrics, cardUsersByUserId, monthlyByUserId]);

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
    return cardUsersWithPayroll;
  }, [cardUsersWithPayroll, statusFilter, today.getTime()]);

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

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:w-[70vw] sm:max-w-[70vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Attendance & Payroll Summary</DialogTitle>
            {payrollQuery.data && (
              <p className="text-sm text-muted-foreground mt-1">
                Period:{' '}
                {format(new Date(payrollQuery.data.period.startDate), 'MMM d, yyyy')} –{' '}
                {format(new Date(payrollQuery.data.period.endDate), 'MMM d, yyyy')}
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto -mx-1 px-1">
            {payrollQuery.isLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading payroll data…</p>
            ) : !payrollQuery.data ? (
              <p className="text-sm text-muted-foreground py-4">Unable to load payroll data.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Emp Code</TableHead>
                    <TableHead>Holiday Hours</TableHead>
                    <TableHead>Time Over</TableHead>
                    <TableHead>Sundays</TableHead>
                    <TableHead className="h-auto whitespace-normal py-2 align-bottom text-right">
                      <span className="block leading-tight">Total Hours</span>
                      <span className="text-muted-foreground text-xs font-normal block leading-tight">
                        (this month {format(new Date(yearForSingle, monthForSingle - 1), 'MMM yyyy')})
                      </span>
                    </TableHead>
                    <TableHead className="h-auto whitespace-normal py-2 align-bottom text-right">
                      <span className="block leading-tight">Payroll Hours</span>
                      <span className="text-muted-foreground text-xs font-normal block leading-tight">
                        {payrollQuery.data.period?.startDate && payrollQuery.data.period?.endDate
                          ? `(${format(new Date(payrollQuery.data.period.startDate), 'd MMM')} - ${format(new Date(payrollQuery.data.period.endDate), 'd MMM')})`
                          : '(current payroll period)'}
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollTableRows.map((row, index) => (
                    <TableRow key={row.userId} className={index % 2 === 1 ? 'bg-muted/50' : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8 shrink-0">
                            <AvatarImage src={row.photoURL} />
                            <AvatarFallback>
                              {row.name
                                .split(/\s+/)
                                .map((s) => s[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{row.name}</p>
                            {row.email && (
                              <a href={`mailto:${row.email}`} className="block text-xs text-primary hover:underline truncate">
                                {row.email}
                              </a>
                            )}
                            {row.phone && (
                              <a href={`tel:${row.phone}`} className="block text-xs text-primary hover:underline truncate">
                                {row.phone}
                              </a>
                            )}
                            <p className="text-xs text-muted-foreground truncate">Branch: {row.branch || '—'}</p>
                            <p className="text-xs text-muted-foreground truncate">Role: {row.role || '—'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{row.empCode != null ? String(row.empCode) : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell
                        className={cn(
                          'text-right',
                          row.totalHours != null ? 'tabular-nums font-medium' : 'text-muted-foreground'
                        )}
                      >
                        {row.totalHours != null ? `${row.totalHours}h` : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{row.payrollHours}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
