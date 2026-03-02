'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useOrganization } from '@clerk/nextjs';
import { format, subDays } from 'date-fns';
import { useMonthlyAttendance, useAttMetricsBatch } from '@/api/hooks';
import { AttendanceChartsSection } from '@/app/reports/tabs/attendance-charts-section';
import type { AttendanceChartsSectionProps } from '@/app/reports/tabs/attendance-charts-section';
import { ReportProgressBar, getProgressColorClasses } from '@/app/reports/tabs/report-progress-bar';
import { getExpectedHoursByDate, EXPECTED_MONTHLY_HOURS, HOURS_BEHIND_BADGE_THRESHOLD } from '@/app/reports/tabs/constants';
import type { ReportCardUser, StatusFilter } from '@/app/reports/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Smartphone, Laptop } from 'lucide-react';
import { XIcon, SettingsIcon, BarChart3Icon } from '@/lib/icons';
import { ExportReportDropdown } from '@/app/reports/export-report-dropdown';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
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
import { formatLastSeen } from '@/app/reports/format-last-seen';

export interface AttendanceReportTabProps {
  singleDate: Date | null;
  setSingleDate: (d: Date | null) => void;
  search: string;
  setSearch: (s: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (s: StatusFilter) => void;
  filteredUsers: ReportCardUser[];
  isLoading: boolean;
  onCardClick: (u: ReportCardUser) => void;
  attendanceChartsProps: Omit<AttendanceChartsSectionProps, 'chartsLoading'>;
  chartsLoading: boolean;
}

function LastSevenDaysDots({
  userRef,
  endDate,
}: {
  userRef: string;
  endDate: Date;
}) {
  const year = endDate.getFullYear();
  const month = endDate.getMonth() + 1;
  const { data, isLoading } = useMonthlyAttendance(userRef, year, month, {
    enabled: !!userRef,
  });
  const sevenDays = useMemo(() => {
    if (!data?.days?.length) return [];
    const end = format(endDate, 'yyyy-MM-dd');
    const start = format(subDays(endDate, 6), 'yyyy-MM-dd');
    return data.days
      .filter((d) => d.date >= start && d.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data?.days, endDate]);
  if (isLoading || sevenDays.length === 0) {
    return (
      <div className="w-full grid grid-cols-7 gap-0 items-center">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="size-2 rounded-full bg-muted animate-pulse justify-self-center"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="w-full grid grid-cols-7 gap-0">
      {sevenDays.map((d) => (
        <div
          key={d.date}
          className="flex flex-col items-center gap-0.5 justify-self-center"
          title={`${d.date}: ${d.status}`}
        >
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(d.date), 'EEE d')}
          </span>
          <div
            className={cn(
              'size-2.5 rounded-full shrink-0',
              d.status === 'attended' && 'bg-green-500',
              d.status === 'missed' && 'bg-red-500',
              d.status === 'future' && 'bg-muted/50'
            )}
          />
        </div>
      ))}
    </div>
  );
}

function ReportUserCardSkeleton() {
  const isMobile = useIsMobile();
  return (
    <Card className={cn('rounded-lg border border-gray-200 bg-white', isMobile ? 'min-h-[160px]' : 'min-h-[220px]')}>
      <CardContent
        className={cn(
          'flex flex-col flex-1 justify-between',
          isMobile ? 'p-3 min-h-[160px]' : 'p-4 min-h-[220px]'
        )}
      >
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            </div>
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-full max-w-[180px] rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
          <div className="w-full">
            <Skeleton className="h-3 w-16 rounded-md mb-1" />
            <div className="w-full grid grid-cols-7 gap-0">
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton
                  key={j}
                  className="size-2.5 rounded-full justify-self-center"
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-1 shrink-0">
          <Skeleton className="h-4 w-32 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 flex-1 w-full rounded-full" />
            <Skeleton className="h-3 w-8 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportUserCard({
  user,
  endDate,
  onClick,
  onSettingsClick,
}: {
  user: ReportCardUser;
  endDate: Date;
  onClick: () => void;
  onSettingsClick: (e: React.MouseEvent) => void;
}) {
  const isMobile = useIsMobile();
  const expectedByNow = getExpectedHoursByDate(endDate);
  const hoursBehind = expectedByNow - user.hoursThisMonth;
  const isBehindBadge = hoursBehind > HOURS_BEHIND_BADGE_THRESHOLD;
  const distanceText =
    user.distanceFromWorkplaceMeters != null
      ? user.distanceFromWorkplaceMeters >= 1000
        ? `~${(user.distanceFromWorkplaceMeters / 1000).toFixed(1)}km away`
        : `~${user.distanceFromWorkplaceMeters}m away`
      : '—';
  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-colors hover:opacity-90 bg-white border rounded-lg',
        user.isPresent ? 'border-green-500' : 'border-red-500'
      )}
      onClick={onClick}
    >
      <div className="absolute top-2 right-2 z-10 flex flex-wrap gap-1 justify-end max-w-[60%]">
        <Badge
          variant={user.isPresent ? 'default' : 'destructive'}
          className={cn(
            'text-[10px] px-1.5 py-0 text-white',
            user.isPresent && 'bg-green-600 hover:bg-green-600 text-white'
          )}
          aria-label={user.isPresent ? 'Present' : 'Absent'}
        >
          {user.isPresent ? 'Present' : 'Absent'}
        </Badge>
        {isBehindBadge && (
          <Badge
            variant="destructive"
            className="text-[10px] px-1.5 py-0 text-white"
            title={`Behind on hours: ${Math.round(hoursBehind)}h under expected`}
            aria-label={`Behind on hours: ${Math.round(hoursBehind)}h under expected`}
          >
            Behind on hours
          </Badge>
        )}
      </div>
      <CardContent
        className={cn(
          'flex flex-col flex-1 justify-between',
          isMobile
            ? 'p-3 min-h-[160px] gap-2'
            : 'p-4 min-h-[220px] gap-3'
        )}
      >
        <div className={cn('flex flex-col flex-1', isMobile ? 'gap-2' : 'gap-3')}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <Avatar className={cn('shrink-0', isMobile ? 'size-8' : 'size-10')}>
                <AvatarImage src={user.photoURL ?? undefined} />
                <AvatarFallback>
                  {user.name
                    .split(/\s+/)
                    .map((s) => s[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className={cn('font-medium text-foreground truncate', isMobile && 'text-sm')}>
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[user.role, user.branch].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            </div>
            <Link
              href={`/reports/users/${user.ref}/settings`}
              onClick={onSettingsClick}
              className="shrink-0 rounded-md p-1 sm:p-1.5 bg-white border border-gray-200 text-foreground hover:bg-gray-50"
              aria-label="User settings"
            >
              <SettingsIcon className={isMobile ? 'size-3.5' : 'size-4'} />
            </Link>
          </div>
          <div className={cn('space-y-0.5 sm:space-y-1', isMobile ? 'text-xs' : 'text-sm')}>
            <a
              href={`mailto:${user.email}`}
              onClick={(e) => e.stopPropagation()}
              className="block truncate text-primary hover:underline"
            >
              {user.email}
            </a>
            {user.phone && (
              <a
                href={`tel:${user.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="block truncate text-primary hover:underline"
              >
                {user.phone}
              </a>
            )}
          </div>
          <div className="w-full">
            <p className="text-xs text-muted-foreground mb-1">Last 7 days</p>
            <div className="w-full">
              <LastSevenDaysDots userRef={user.ref} endDate={endDate} />
            </div>
          </div>
          {user.firstAttendanceInPeriod && (
            <p className="text-xs text-muted-foreground">
              First attended: {format(new Date(user.firstAttendanceInPeriod), 'MMM d, yyyy - HH:mm')}
            </p>
          )}
        </div>
        <div className={cn('shrink-0', isMobile ? 'mt-2 space-y-0.5' : 'mt-3 space-y-1')}>
          <p className={cn('text-muted-foreground flex items-center justify-between gap-2', isMobile ? 'text-xs' : 'text-sm')}>
            <span>
              <strong className="text-foreground">{user.hoursThisMonth}h</strong>
              /{EXPECTED_MONTHLY_HOURS}h this month
            </span>
            <span className="shrink-0">~{expectedByNow}h expected</span>
          </p>
          <div className="flex items-center gap-2">
            <ReportProgressBar value={user.progressPercent} />
            <span
              className={cn(
                'text-xs tabular-nums font-medium',
                getProgressColorClasses(user.progressPercent).text
              )}
            >
              {user.progressPercent}%
            </span>
          </div>
          {user.lastAppAccessAt && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              {user.lastAppAccessDeviceType === 'phone' && (
                <Smartphone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              {user.lastAppAccessDeviceType === 'laptop' && (
                <Laptop className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              {formatLastSeen(user.lastAppAccessAt)}
            </p>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/50 text-xs">
            <div className="min-w-0 max-w-[60%] sm:max-w-[60%]">
              {user.shiftStartAddress ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(user.shiftStartAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate block"
                  title={user.shiftStartAddress}
                  onClick={(e) => e.stopPropagation()}
                >
                  {user.shiftStartAddress}
                </a>
              ) : (
                <p className="text-foreground truncate">—</p>
              )}
            </div>
            <div className="shrink-0">
              <p className="text-foreground">{distanceText}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryHoursModal({
  open,
  onOpenChange,
  users,
  reportDate,
  runAt,
  companyName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: ReportCardUser[];
  reportDate: Date | null;
  runAt: Date | null;
  companyName: string;
}) {
  const userIds = useMemo(() => users.map((u) => u.userId), [users]);
  const { payrollHoursByUserId, isLoading: payrollLoading } = useAttMetricsBatch(
    userIds,
    { enabled: open }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-w-[95vw] sm:max-w-[90vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Total Hours Per Employee
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm text-foreground">
          <p className="font-medium text-black">{companyName}</p>
          <p className="text-black">
            Date: {reportDate ? format(reportDate, 'PPP') : '—'}
          </p>
          <p className="text-black">
            Run at: {runAt ? format(runAt, 'HH:mm') : '—'}
          </p>
        </div>
        <div className="flex-1 min-h-0 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-black font-medium">Employee Name</TableHead>
                <TableHead className="text-black font-medium">Employee Code</TableHead>
                <TableHead className="text-black font-medium">Today</TableHead>
                <TableHead className="text-black font-medium">Check-in</TableHead>
                <TableHead className="text-black font-medium">Check-out</TableHead>
                <TableHead className="text-black font-medium">Working hours (today)</TableHead>
                <TableHead className="text-black font-medium">Late (min)</TableHead>
                <TableHead className="text-black font-medium">Early (min)</TableHead>
                <TableHead className="text-black font-medium">Total shifts (month)</TableHead>
                <TableHead className="text-black font-medium">Holiday</TableHead>
                <TableHead className="text-black font-medium">Time over</TableHead>
                <TableHead className="text-black font-medium">Sundays</TableHead>
                <TableHead className="text-black font-medium">Total hours this month</TableHead>
                <TableHead className="text-black font-medium">Payroll Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => {
                const payrollHours = payrollHoursByUserId.get(user.userId);
                return (
                  <TableRow
                    key={user.userId}
                    className={cn(
                      'border-b',
                      index % 2 === 0 ? 'bg-gray-100/80' : 'bg-white'
                    )}
                  >
                    <TableCell className="text-black">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={user.photoURL ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {user.name
                              .split(/\s+/)
                              .map((s) => s[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-black">
                      {user.hrID != null ? String(user.hrID) : '—'}
                    </TableCell>
                    <TableCell className="text-black">
                      <span
                        className={cn(
                          'text-xs font-medium',
                          user.isPresent ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {user.isPresent ? 'Present' : 'Absent'}
                      </span>
                    </TableCell>
                    <TableCell className="text-black tabular-nums">
                      {user.checkInTime ?? '—'}
                    </TableCell>
                    <TableCell className="text-black tabular-nums">
                      {user.checkOutTime ?? '—'}
                    </TableCell>
                    <TableCell className="text-black tabular-nums">
                      {user.workingHours != null && user.workingHours !== '' ? `${user.workingHours}h` : '—'}
                    </TableCell>
                    <TableCell className="text-black tabular-nums">
                      {user.lateMinutes != null && user.lateMinutes > 0 ? `${user.lateMinutes}` : '—'}
                    </TableCell>
                    <TableCell className="text-black tabular-nums">
                      {user.earlyMinutes != null && user.earlyMinutes > 0 ? `${user.earlyMinutes}` : '—'}
                    </TableCell>
                    <TableCell className="text-black tabular-nums">
                      {user.totalShifts != null ? String(user.totalShifts) : '—'}
                    </TableCell>
                    <TableCell className="text-black">—</TableCell>
                    <TableCell className="text-black">
                      {user.overtimeHours != null && user.overtimeHours > 0
                        ? `${user.overtimeHours}h`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-black">—</TableCell>
                    <TableCell className="text-black tabular-nums">
                      {user.hoursThisMonth}h
                    </TableCell>
                    <TableCell className="text-black tabular-nums">
                      {payrollLoading ? (
                        <span className="text-muted-foreground">Loading...</span>
                      ) : payrollHours != null ? (
                        `${payrollHours}h`
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {users.length === 0 && (
          <p className="text-center text-black py-4">No employees to show.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AttendanceReportTab({
  singleDate,
  setSingleDate,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  filteredUsers,
  isLoading,
  onCardClick,
  attendanceChartsProps,
  chartsLoading,
}: AttendanceReportTabProps) {
  const { organization } = useOrganization();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryRunAt, setSummaryRunAt] = useState<Date | null>(null);

  const handleOpenSummary = () => {
    setSummaryRunAt(new Date());
    setSummaryOpen(true);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 mb-6">
        {singleDate && !chartsLoading && (
          <p className="text-sm text-muted-foreground mb-3">
            {format(singleDate, 'PPP')} · Attendance rate: <strong>{attendanceChartsProps.attendanceRate}%</strong>
          </p>
        )}
        <AttendanceChartsSection
          {...attendanceChartsProps}
          chartsLoading={chartsLoading}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 min-w-[140px] bg-white border-gray-200 text-foreground justify-center"
              >
                {singleDate
                  ? format(singleDate, 'PPP')
                  : 'Pick date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={singleDate ?? undefined}
                onSelect={(d) => setSingleDate(d ?? null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-1">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="h-9 min-w-[140px] w-[140px] bg-white border-gray-200 text-foreground [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="early">Early</SelectItem>
                <SelectItem value="behind_on_hours">Behind on hours</SelectItem>
                <SelectItem value="idle">Idle (&gt;7 days in-active)</SelectItem>
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
        <div className="flex flex-nowrap items-center gap-2">
          <div className="relative w-56 min-w-0 shrink sm:w-64">
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
          <ExportReportDropdown singleDate={singleDate} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSummary}
            className="shrink-0"
          >
            <BarChart3Icon className="size-4 mr-1.5" />
            Summary
          </Button>
        </div>
      </div>

      <SummaryHoursModal
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        users={filteredUsers}
        reportDate={singleDate}
        runAt={summaryRunAt}
        companyName={organization?.name ?? 'Organisation'}
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ReportUserCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {filteredUsers.map((user) => (
              <ReportUserCard
                key={user.userId}
                user={user}
                endDate={singleDate ?? new Date()}
                onClick={() => onCardClick(user)}
                onSettingsClick={(e) => {
                  e.stopPropagation();
                }}
              />
            ))}
          </div>
        )}
        {!isLoading && filteredUsers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No users to show. Select a date and ensure you have access.
          </p>
        )}
      </div>
    </div>
  );
}
