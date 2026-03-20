'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import { useMonthlyAttendance } from '@/api/hooks';
import { ReportProgressBar, getProgressColorClasses } from '@/app/reports/tabs/report-progress-bar';
import {
  getExpectedHoursByDateWeekdaysOnly,
  getExpectedMonthlyHoursWeekdaysOnly,
  HOURS_BEHIND_BADGE_THRESHOLD,
} from '@/app/reports/tabs/constants';
import type { ReportCardUser } from '@/app/reports/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsIcon } from '@/lib/icons';
import { Smartphone, Laptop, Clock } from 'lucide-react';
import { formatLastSeen } from '@/app/reports/format-last-seen';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

function LastSevenDaysDots({
  userRef,
  endDate,
  last7Days: last7DaysProp,
}: {
  userRef: string;
  endDate: Date;
  /** When provided (e.g. from monthly metrics), skips useMonthlyAttendance fetch. */
  last7Days?: Array<{ date: string; status: 'attended' | 'missed' | 'future' }>;
}) {
  const year = endDate.getFullYear();
  const month = endDate.getMonth() + 1;
  const { data, isLoading } = useMonthlyAttendance(userRef, year, month, {
    enabled: !!userRef && last7DaysProp == null,
  });
  const sevenDays = useMemo(() => {
    if (last7DaysProp?.length) return last7DaysProp;
    if (!data?.days?.length) return [];
    const end = format(endDate, 'yyyy-MM-dd');
    const start = format(subDays(endDate, 6), 'yyyy-MM-dd');
    return (data.days as { date: string; status: string }[])
      .filter((d) => d.date >= start && d.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [last7DaysProp, data?.days, endDate]);
  const isLoadingDots = last7DaysProp == null && isLoading;
  if (isLoadingDots || sevenDays.length === 0) {
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

export function ReportUserCardSkeleton() {
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
          <Skeleton className="h-4 w-full max-w-[min(100%,20rem)] rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 flex-1 w-full rounded-full" />
            <Skeleton className="h-3 w-8 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportUserCard({
  user,
  endDate,
  onClick,
  onSettingsClick,
  onClockClick,
}: {
  user: ReportCardUser;
  endDate: Date;
  onClick: () => void;
  onSettingsClick: (e: React.MouseEvent) => void;
  onClockClick?: (e: React.MouseEvent) => void;
}) {
  const isMobile = useIsMobile();
  const usePayroll =
    user.payrollHours != null &&
    user.payrollTargetHours != null &&
    user.payrollTargetHours > 0;
  const expectedByNow = getExpectedHoursByDateWeekdaysOnly(endDate);
  const expectedMonthly = getExpectedMonthlyHoursWeekdaysOnly(
    endDate.getFullYear(),
    endDate.getMonth() + 1
  );
  const hoursBehind = usePayroll
    ? (user.payrollExpectedByNow ?? 0) - (user.payrollHours ?? 0)
    : expectedByNow - user.hoursThisMonth;
  const isBehindBadge = hoursBehind > HOURS_BEHIND_BADGE_THRESHOLD;
  const payrollExpectedByNow = user.payrollExpectedByNow ?? 0;
  const actualPayrollRounded = Math.round(user.payrollHours ?? 0);
  const actualMonthRounded = Math.round(user.hoursThisMonth);
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
              <div className="min-w-0 flex-1 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className={cn('font-medium text-foreground truncate', isMobile && 'text-sm')}>
                    {user.name}
                  </p>
                  <a
                    href={`mailto:${user.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block truncate text-xs text-primary hover:underline"
                  >
                    {user.email}
                  </a>
                </div>
                <div className="min-w-0 text-xs text-muted-foreground sm:text-right">
                  <p className="truncate">
                    {user.phone && (
                      <>
                        <a
                          href={`tel:${user.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:underline"
                        >
                          {user.phone}
                        </a>
                        {' · '}
                      </>
                    )}
                    Branch: {user.branch || '—'} · Role: {user.role || '—'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {onClockClick && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClockClick(e);
                  }}
                  className="rounded-md p-1 sm:p-1.5 bg-white border border-gray-200 text-foreground hover:bg-gray-50"
                  aria-label="View attendance records"
                >
                  <Clock className={isMobile ? 'size-3.5' : 'size-4'} />
                </button>
              )}
              <Link
                href={`/reports/users/${user.ref}/settings`}
                onClick={onSettingsClick}
                className="rounded-md p-1 sm:p-1.5 bg-white border border-gray-200 text-foreground hover:bg-gray-50"
                aria-label="User settings"
              >
                <SettingsIcon className={isMobile ? 'size-3.5' : 'size-4'} />
              </Link>
            </div>
          </div>
          <div className="w-full">
            <p className="text-xs text-muted-foreground mb-1">Last 7 days</p>
            <div className="w-full">
              <LastSevenDaysDots
                userRef={user.ref}
                endDate={endDate}
                last7Days={user.last7Days}
              />
            </div>
          </div>
        </div>
        <div className={cn('shrink-0 min-w-0', isMobile ? 'mt-2 space-y-0.5' : 'mt-3 space-y-1')}>
          <p className={cn('text-muted-foreground flex items-center justify-between gap-2 min-w-0', isMobile ? 'text-xs' : 'text-sm')}>
            {usePayroll ? (
              <>
                <span className="min-w-0 truncate">
                  {payrollExpectedByNow > 0 ? (
                    <>
                      <strong className="text-foreground">{actualPayrollRounded}</strong>/
                      {payrollExpectedByNow} expected hours
                    </>
                  ) : (
                    <span className="text-foreground">—/— expected hours</span>
                  )}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {user.payrollTargetHours}h period total
                </span>
              </>
            ) : (
              <>
                <span className="min-w-0 truncate">
                  {expectedByNow > 0 ? (
                    <>
                      <strong className="text-foreground">{actualMonthRounded}</strong>/
                      {expectedByNow} expected hours
                    </>
                  ) : (
                    <span className="text-foreground">—/— expected hours</span>
                  )}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {expectedMonthly}h this month
                </span>
              </>
            )}
          </p>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <ReportProgressBar value={usePayroll ? (user.payrollProgressPercent ?? 0) : user.progressPercent} />
            </div>
            <span
              className={cn(
                'text-xs tabular-nums font-medium shrink-0',
                getProgressColorClasses(usePayroll ? (user.payrollProgressPercent ?? 0) : user.progressPercent).text
              )}
            >
              {usePayroll ? (user.payrollProgressPercent ?? 0) : user.progressPercent}%
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/50 text-xs min-w-0">
            <div className="min-w-0 w-full max-w-full sm:max-w-[60%]">
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
