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
import type { ClockInOptionKey } from '@/api/types/attendance';
import { Card, CardContent } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsIcon } from '@/lib/icons';
import {
  OPTION_KEY_TO_LABEL,
  optionKeyFromCheckInNotes,
  resolveDisplayedClockInModeKey,
} from '@/lib/clock-in-options';
import { Smartphone, Laptop, Clock, Building2, Home, House, MapPinX, Van } from 'lucide-react';
import { formatLastSeen } from '@/app/reports/format-last-seen';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { formatEnumLabel } from '@/lib/format-enum-label';

const CLOCK_IN_MODE_BADGE: Record<
  ClockInOptionKey,
  { Icon: typeof Building2; className: string }
> = {
  at_office: { Icon: Building2, className: 'bg-green-100 text-green-700 border border-green-200/80' },
  work_from_home: { Icon: Home, className: 'bg-violet-100 text-violet-700 border border-violet-200/80' },
  starting_from_home: { Icon: House, className: 'bg-orange-100 text-orange-800 border border-orange-200/80' },
  offsite: { Icon: MapPinX, className: 'bg-red-100 text-red-700 border border-red-200/80' },
  driving: { Icon: Van, className: 'bg-purple-100 text-purple-700 border border-purple-200/80' },
};

const PERFORMANCE_WARNING_CHIP: Record<
  1 | 2 | 3,
  { className: string; shortLabel: string }
> = {
  1: {
    className: 'bg-green-100 text-green-800 border border-green-200/80',
    shortLabel: 'First warning (tier 1)',
  },
  2: {
    className: 'bg-amber-100 text-amber-900 border border-amber-200/80',
    shortLabel: 'Second warning (tier 2)',
  },
  3: {
    className: 'bg-red-100 text-red-800 border border-red-200/80',
    shortLabel: 'Final warning (tier 3)',
  },
};

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
  if (isMobile) {
    return (
      <Card className="gap-0 py-0 rounded-lg border border-gray-200 bg-white">
        <CardContent className="flex items-start gap-2 p-2">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-[min(100%,12rem)] rounded-md" />
            <Skeleton className="h-3 w-[min(100%,9rem)] rounded-md" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end gap-1">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="size-8 shrink-0 rounded-md" />
              <Skeleton className="size-8 shrink-0 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="rounded-lg border border-gray-200 bg-white min-h-[220px]">
      <CardContent className="flex flex-col flex-1 justify-between p-4 min-h-[220px]">
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
  branchLocationRadiusMeters = 50,
  onClick,
  onSettingsClick,
  onClockClick,
}: {
  user: ReportCardUser;
  endDate: Date;
  /** Server BRANCH_LOCATION_RADIUS_METERS (daily overview); defaults to 50 if omitted. */
  branchLocationRadiusMeters?: number;
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
  const notesKey = useMemo(
    () => (user.isPresent ? optionKeyFromCheckInNotes(user.checkInNotes) : null),
    [user.isPresent, user.checkInNotes]
  );
  const displayModeKey = useMemo(
    () =>
      user.isPresent
        ? resolveDisplayedClockInModeKey(
            notesKey,
            user.distanceFromWorkplaceMeters,
            branchLocationRadiusMeters
          )
        : null,
    [
      user.isPresent,
      notesKey,
      user.distanceFromWorkplaceMeters,
      branchLocationRadiusMeters,
    ]
  );
  const modeBadge = displayModeKey ? CLOCK_IN_MODE_BADGE[displayModeKey] : null;
  const ModeIcon = modeBadge?.Icon;
  const modeChipTitle =
    displayModeKey == null
      ? null
      : displayModeKey === 'offsite' && notesKey !== 'offsite'
        ? `${OPTION_KEY_TO_LABEL.offsite} (${distanceText})`
        : OPTION_KEY_TO_LABEL[displayModeKey];
  const defaultModeTitle =
    notesKey === 'at_office' && user.distanceFromWorkplaceMeters == null
      ? 'Distance to branch unknown'
      : 'Location mode unknown';
  const showModeHover = user.isPresent;
  const hasResolvedModeChip =
    Boolean(modeBadge && displayModeKey && ModeIcon && modeChipTitle);
  const modeHoverPrimary = modeChipTitle ?? defaultModeTitle;
  const modeHoverAriaLabel = hasResolvedModeChip
    ? `Today’s attendance mode: ${modeChipTitle}`
    : defaultModeTitle;
  const mapsQuery = user.shiftStartAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(user.shiftStartAddress)}`
    : null;
  const salesWarningLevel = user.targetWarnings?.level;
  const salesWarningChip =
    salesWarningLevel === 1 || salesWarningLevel === 2 || salesWarningLevel === 3
      ? PERFORMANCE_WARNING_CHIP[salesWarningLevel]
      : null;

  if (isMobile) {
    return (
      <Card
        className={cn(
          'relative cursor-pointer gap-0 py-0 transition-colors hover:opacity-90 bg-white border rounded-lg',
          user.isPresent ? 'border-green-500' : 'border-red-500'
        )}
        onClick={onClick}
      >
        <CardContent className="flex items-start gap-2 p-2">
          <Avatar className="size-9 shrink-0">
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
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              Branch: {user.branch || '—'}
            </p>
          </div>
          <div
            className="flex max-w-[42%] shrink-0 flex-col items-end gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex max-w-full flex-wrap justify-end gap-1">
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
              {salesWarningChip ? (
                <HoverCard openDelay={200}>
                  <HoverCardTrigger asChild>
                    <span
                      className={cn(
                        'inline-flex size-6 shrink-0 items-center justify-center rounded-full cursor-default',
                        salesWarningChip.className
                      )}
                      title={`Sales performance warning: Level ${salesWarningLevel}`}
                      aria-label={`Sales performance warning: Level ${salesWarningLevel}`}
                    >
                      <span className="text-[12px] leading-none select-none" aria-hidden>
                        ⚠️
                      </span>
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent
                    side="bottom"
                    align="end"
                    className="w-72 space-y-2 p-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-sm font-medium leading-snug">
                      Sales performance warning: Level {salesWarningLevel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {salesWarningChip.shortLabel}
                    </p>
                  </HoverCardContent>
                </HoverCard>
              ) : null}
              {showModeHover ? (
                <HoverCard openDelay={200}>
                  <HoverCardTrigger asChild>
                    <span
                      className={cn(
                        'inline-flex size-6 shrink-0 items-center justify-center rounded-full cursor-default',
                        hasResolvedModeChip && modeBadge
                          ? modeBadge.className
                          : 'border border-border bg-muted text-black'
                      )}
                      title={modeHoverPrimary}
                      aria-label={modeHoverAriaLabel}
                    >
                      {hasResolvedModeChip && ModeIcon ? (
                        <ModeIcon className="size-3" aria-hidden />
                      ) : (
                        <Building2 className="size-3" aria-hidden />
                      )}
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent
                    side="bottom"
                    align="end"
                    className="w-72 space-y-2 p-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-sm font-medium leading-snug">{modeHoverPrimary}</p>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {user.branch ? (
                        <p>
                          <span className="text-foreground/80">Branch: </span>
                          {user.branch}
                        </p>
                      ) : null}
                      {distanceText !== '—' ? (
                        <p>
                          <span className="text-foreground/80">Distance: </span>
                          {distanceText}
                        </p>
                      ) : null}
                      {user.shiftStartAddress ? (
                        <p className="break-words text-foreground/90">{user.shiftStartAddress}</p>
                      ) : null}
                    </div>
                    {mapsQuery ? (
                      <a
                        href={mapsQuery}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs font-medium text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open in Maps
                      </a>
                    ) : null}
                  </HoverCardContent>
                </HoverCard>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {onClockClick && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClockClick(e);
                  }}
                  className="rounded-md border border-gray-200 bg-white p-1 text-foreground hover:bg-gray-50"
                  aria-label="View attendance records"
                >
                  <Clock className="size-3.5" />
                </button>
              )}
              <Link
                href={`/reports/users/${user.ref}/settings`}
                onClick={onSettingsClick}
                className="rounded-md border border-gray-200 bg-white p-1 text-foreground hover:bg-gray-50"
                aria-label="User settings"
              >
                <SettingsIcon className="size-3.5" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-colors hover:opacity-90 bg-white border rounded-lg',
        user.isPresent ? 'border-green-500' : 'border-red-500'
      )}
      onClick={onClick}
    >
      <div className="absolute top-2 right-2 z-10 flex flex-wrap items-center gap-1 justify-end max-w-[60%]">
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
        {salesWarningChip ? (
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
              <span
                className={cn(
                  'inline-flex size-7 shrink-0 items-center justify-center rounded-full cursor-default',
                  salesWarningChip.className
                )}
                title={isMobile ? `Sales performance warning: Level ${salesWarningLevel}` : undefined}
                aria-label={`Sales performance warning: Level ${salesWarningLevel}`}
              >
                <span className="text-[13px] leading-none select-none" aria-hidden>
                  ⚠️
                </span>
              </span>
            </HoverCardTrigger>
            <HoverCardContent
              side="bottom"
              align="end"
              className="w-72 space-y-2 p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-medium leading-snug">
                Sales performance warning: Level {salesWarningLevel}
              </p>
              <p className="text-xs text-muted-foreground">{salesWarningChip.shortLabel}</p>
            </HoverCardContent>
          </HoverCard>
        ) : null}
        {showModeHover ? (
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
              <span
                className={cn(
                  'inline-flex size-7 shrink-0 items-center justify-center rounded-full cursor-default',
                  hasResolvedModeChip && modeBadge
                    ? modeBadge.className
                    : 'border border-border bg-muted text-black'
                )}
                title={isMobile ? modeHoverPrimary : undefined}
                aria-label={modeHoverAriaLabel}
              >
                {hasResolvedModeChip && ModeIcon ? (
                  <ModeIcon className="size-3.5" aria-hidden />
                ) : (
                  <Building2 className="size-3.5" aria-hidden />
                )}
              </span>
            </HoverCardTrigger>
            <HoverCardContent
              side="bottom"
              align="end"
              className="w-72 space-y-2 p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-medium leading-snug">{modeHoverPrimary}</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {user.branch ? (
                  <p>
                    <span className="text-foreground/80">Branch: </span>
                    {user.branch}
                  </p>
                ) : null}
                {distanceText !== '—' ? (
                  <p>
                    <span className="text-foreground/80">Distance: </span>
                    {distanceText}
                  </p>
                ) : null}
                {user.shiftStartAddress ? (
                  <p className="break-words text-foreground/90">{user.shiftStartAddress}</p>
                ) : null}
              </div>
              {mapsQuery ? (
                <a
                  href={mapsQuery}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open in Maps
                </a>
              ) : null}
            </HoverCardContent>
          </HoverCard>
        ) : null}
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
              <div className="min-w-0 flex-1 flex flex-col gap-1">
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
                <p className="text-xs text-muted-foreground truncate">
                  Branch: {user.branch || '—'}
                </p>
                <p className="text-xs text-muted-foreground truncate">Role: {user.role || '—'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  Workforce:{' '}
                  {user.workforceType?.trim()
                    ? formatEnumLabel(user.workforceType.trim())
                    : '—'}
                </p>
                {user.phone ? (
                  <a
                    href={`tel:${user.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block truncate text-xs text-primary hover:underline"
                  >
                    {user.phone}
                  </a>
                ) : null}
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
