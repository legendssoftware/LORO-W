'use client';

import type { ReactNode } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useUser, useUserTarget, useUserPreferences } from '@/api/hooks';
import { ReportProgressBar, getProgressColorClasses } from '@/app/reports/tabs/report-progress-bar';
import { getExpectedHoursByDate, EXPECTED_MONTHLY_HOURS, HOURS_BEHIND_BADGE_THRESHOLD } from '@/app/reports/tabs/constants';
import type { ReportCardUser } from '@/app/reports/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { SettingsIcon, XIcon } from '@/lib/icons';
import { Smartphone, Laptop } from 'lucide-react';
import { formatLastSeen } from '@/app/reports/format-last-seen';
import { cn } from '@/lib/utils';

function ModalRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn('font-medium break-words text-right', valueClassName)}>{value}</span>
    </div>
  );
}

function ModalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ReportUserDetailModal({
  user,
  endDate,
  onClose,
}: {
  user: ReportCardUser | null;
  endDate: Date;
  onClose: () => void;
}) {
  const open = !!user;
  const expectedByNow = getExpectedHoursByDate(endDate);
  const hoursBehind = user ? expectedByNow - user.hoursThisMonth : 0;
  const isBehindBadge = user ? hoursBehind > HOURS_BEHIND_BADGE_THRESHOLD : false;

  const { data: userData } = useUser(user?.ref ?? null, { enabled: !!user?.ref });
  const { data: targetData } = useUserTarget(user?.ref ?? null, { enabled: !!user?.ref });
  const { data: prefsData } = useUserPreferences(user?.ref ?? null, { enabled: !!user?.ref });

  const userTarget = targetData?.userTarget as Record<string, unknown> | null | undefined;
  const preferences = prefsData?.preferences ?? {};
  const employmentProfile = (userData?.userEmployeementProfile ?? (userData as Record<string, unknown>)?.['employmentProfile']) as Record<string, unknown> | null | undefined;

  const formatTargetValue = (v: unknown): string => {
    if (v == null) return '—';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return v;
    return String(v);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col w-full max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] p-4 sm:p-6"
      >
        <div className="flex items-start justify-between gap-2 shrink-0">
          <DialogHeader>
            <DialogTitle>
              {user ? user.name : 'User details'}
            </DialogTitle>
          </DialogHeader>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 shadow-none focus:ring-0"
            aria-label="Close"
          >
            <XIcon className="size-4 text-red-600" />
          </Button>
        </div>
        {user && (
          <div className="overflow-y-auto flex-1 min-h-0 pt-2 -mx-1 px-1 space-y-4">
            <ModalSection title="Identity">
              <div className="flex items-center gap-3">
                <Avatar className="size-12 shrink-0">
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
                  <ModalRow label="Full name" value={user.name} />
                </div>
              </div>
            </ModalSection>

            <ModalSection title="Contact">
              <ModalRow
                label="Email"
                value={
                  <a href={`mailto:${user.email}`} className="text-primary hover:underline truncate block">
                    {user.email}
                  </a>
                }
              />
              <ModalRow
                label="Phone"
                value={
                  user.phone ? (
                    <a href={`tel:${user.phone}`} className="text-primary hover:underline">
                      {user.phone}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
            </ModalSection>

            <ModalSection title="Role & tags">
              <ModalRow label="Role" value={user.role ?? '—'} />
              <ModalRow label="Access level" value={user.accessLevel ?? '—'} />
              <ModalRow label="Branch" value={user.branch ?? '—'} />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[user.role, user.accessLevel, user.branch]
                  .filter(Boolean)
                  .map((tag, index) => (
                    <Badge key={`role-tag-${index}-${String(tag)}`} variant="secondary" className="text-xs font-normal">
                      {tag}
                    </Badge>
                  ))}
              </div>
            </ModalSection>

            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={user.isPresent ? 'default' : 'destructive'}
                className={cn('text-xs text-white', user.isPresent && 'bg-green-600 hover:bg-green-600')}
                aria-label={user.isPresent ? 'Present' : 'Absent'}
              >
                {user.isPresent ? 'Present' : 'Absent'}
              </Badge>
              {isBehindBadge && (
                <Badge
                  variant="destructive"
                  className="text-xs text-white"
                  title={`Behind on hours: ${Math.round(hoursBehind)}h under expected`}
                  aria-label={`Behind on hours: ${Math.round(hoursBehind)}h under expected`}
                >
                  Behind on hours ({Math.round(hoursBehind)}h under expected)
                </Badge>
              )}
            </div>

            {user.firstAttendanceInPeriod && (
              <ModalSection title="Attendance in period (last 7 days)">
                <ModalRow
                  label="First attended"
                  value={format(new Date(user.firstAttendanceInPeriod), 'MMM d, yyyy - HH:mm')}
                />
              </ModalSection>
            )}

            {user.lastAppAccessAt && (
              <ModalSection title="App access">
                <ModalRow
                  label="Last seen"
                  value={
                    <span className="flex items-center gap-2">
                      {user.lastAppAccessDeviceType === 'phone' && (
                        <Smartphone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      {user.lastAppAccessDeviceType === 'laptop' && (
                        <Laptop className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      {formatLastSeen(user.lastAppAccessAt)}
                    </span>
                  }
                />
              </ModalSection>
            )}

            <ModalSection title="Hours this month">
              <ModalRow
                label="Hours this month"
                value={`${user.hoursThisMonth}h / ${EXPECTED_MONTHLY_HOURS}h`}
              />
              <ModalRow label="Expected by now" value={`~${expectedByNow}h`} />
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ReportProgressBar value={user.progressPercent} />
                </div>
                <span
                  className={cn(
                    'text-xs tabular-nums font-medium shrink-0',
                    getProgressColorClasses(user.progressPercent).text
                  )}
                >
                  {user.progressPercent}%
                </span>
              </div>
            </ModalSection>

            <ModalSection title="Status">
              <ModalRow
                label="Today"
                value={
                  <span
                    className={cn(
                      'font-medium',
                      user.isPresent
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {user.isPresent ? 'Present' : 'Absent'}
                  </span>
                }
              />
            </ModalSection>

            {user.isPresent && (
              <ModalSection title="Today's attendance">
                {user.checkInTime != null && user.checkInTime !== '' && (
                  <ModalRow label="Check-in time" value={user.checkInTime} />
                )}
                {user.checkOutTime != null && user.checkOutTime !== '' && (
                  <ModalRow label="Check-out time" value={user.checkOutTime} />
                )}
                {user.workingHours != null && user.workingHours !== '' && (
                  <ModalRow label="Working hours today" value={`${user.workingHours}h`} />
                )}
                {user.shiftDuration != null && user.shiftDuration !== '' && (
                  <ModalRow label="Shift duration" value={user.shiftDuration} />
                )}
                {user.isOnBreak !== undefined && (
                  <ModalRow label="On break" value={user.isOnBreak ? 'Yes' : 'No'} />
                )}
                {user.earlyMinutes != null && user.earlyMinutes > 0 && (
                  <ModalRow label="Early (minutes)" value={`${user.earlyMinutes}m`} />
                )}
                {user.lateMinutes != null && user.lateMinutes > 0 && (
                  <ModalRow label="Late (minutes)" value={`${user.lateMinutes}m`} />
                )}
                {user.distanceFromWorkplaceMeters != null && (
                  <ModalRow
                    label="Distance from workplace"
                    value={
                      user.distanceFromWorkplaceMeters >= 1000
                        ? `~${(user.distanceFromWorkplaceMeters / 1000).toFixed(1)} km`
                        : `~${user.distanceFromWorkplaceMeters} m`
                    }
                  />
                )}
                {user.shiftStartAddress && (
                  <ModalRow
                    label="Clock-in address"
                    value={
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(user.shiftStartAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {user.shiftStartAddress}
                      </a>
                    }
                  />
                )}
              </ModalSection>
            )}

            {!user.isPresent && user.lastSeenDate != null && user.lastSeenDate !== '' && (
              <ModalSection title="Last seen">
                <ModalRow label="Last seen date" value={user.lastSeenDate} />
              </ModalSection>
            )}

            <ModalSection title="Employment">
              {user.employeeSince != null && user.employeeSince !== '' && (
                <ModalRow label="Employee since" value={user.employeeSince} />
              )}
              {user.isActive !== undefined && (
                <ModalRow label="Active" value={user.isActive ? 'Yes' : 'No'} />
              )}
            </ModalSection>

            <ModalSection title="This month">
              {user.totalShifts != null && (
                <ModalRow label="Total shifts" value={String(user.totalShifts)} />
              )}
              {user.overtimeHours != null && user.overtimeHours > 0 && (
                <ModalRow label="Overtime hours" value={`${user.overtimeHours}h`} />
              )}
            </ModalSection>

            {userTarget && Object.keys(userTarget).length > 0 && (
              <ModalSection title="User targets">
                {userTarget.targetSalesAmount != null && (
                  <ModalRow label="Target sales amount" value={formatTargetValue(userTarget.targetSalesAmount)} />
                )}
                {userTarget.currentSalesAmount != null && (
                  <ModalRow label="Current sales amount" value={formatTargetValue(userTarget.currentSalesAmount)} />
                )}
                {userTarget.targetQuotationsAmount != null && (
                  <ModalRow label="Target quotations" value={formatTargetValue(userTarget.targetQuotationsAmount)} />
                )}
                {userTarget.currentQuotationsAmount != null && (
                  <ModalRow label="Current quotations" value={formatTargetValue(userTarget.currentQuotationsAmount)} />
                )}
                {userTarget.targetHoursWorked != null && (
                  <ModalRow label="Target hours worked" value={formatTargetValue(userTarget.targetHoursWorked)} />
                )}
                {userTarget.currentHoursWorked != null && (
                  <ModalRow label="Current hours worked" value={formatTargetValue(userTarget.currentHoursWorked)} />
                )}
                {userTarget.targetCheckIns != null && (
                  <ModalRow label="Target check-ins" value={formatTargetValue(userTarget.targetCheckIns)} />
                )}
                {userTarget.currentCheckIns != null && (
                  <ModalRow label="Current check-ins" value={formatTargetValue(userTarget.currentCheckIns)} />
                )}
                {userTarget.targetCalls != null && (
                  <ModalRow label="Target calls" value={formatTargetValue(userTarget.targetCalls)} />
                )}
                {userTarget.currentCalls != null && (
                  <ModalRow label="Current calls" value={formatTargetValue(userTarget.currentCalls)} />
                )}
                {userTarget.targetPeriod != null && (
                  <ModalRow label="Target period" value={formatTargetValue(userTarget.targetPeriod)} />
                )}
              </ModalSection>
            )}

            {(preferences && Object.keys(preferences).length > 0) && (
              <ModalSection title="User preferences">
                {preferences.theme != null && (
                  <ModalRow label="Theme" value={String(preferences.theme)} />
                )}
                {preferences.language != null && (
                  <ModalRow label="Language" value={String(preferences.language)} />
                )}
                {preferences.notifications != null && (
                  <ModalRow label="Notifications" value={preferences.notifications ? 'On' : 'Off'} />
                )}
                {preferences.shiftAutoEnd != null && (
                  <ModalRow label="Shift auto-end" value={preferences.shiftAutoEnd ? 'Yes' : 'No'} />
                )}
                {preferences.notificationFrequency != null && (
                  <ModalRow label="Notification frequency" value={String(preferences.notificationFrequency)} />
                )}
                {preferences.dateFormat != null && (
                  <ModalRow label="Date format" value={String(preferences.dateFormat)} />
                )}
                {preferences.timeFormat != null && (
                  <ModalRow label="Time format" value={String(preferences.timeFormat)} />
                )}
                {preferences.emailNotifications != null && (
                  <ModalRow label="Email notifications" value={preferences.emailNotifications ? 'On' : 'Off'} />
                )}
                {preferences.timezone != null && (
                  <ModalRow label="Timezone" value={String(preferences.timezone)} />
                )}
              </ModalSection>
            )}

            {employmentProfile && Object.keys(employmentProfile).length > 0 && (
              <ModalSection title="Employment history">
                {employmentProfile.position != null && employmentProfile.position !== '' && (
                  <ModalRow label="Position" value={String(employmentProfile.position)} />
                )}
                {employmentProfile.department != null && employmentProfile.department !== '' && (
                  <ModalRow label="Department" value={String(employmentProfile.department)} />
                )}
                {employmentProfile.branchref != null && employmentProfile.branchref !== '' && (
                  <ModalRow label="Branch ref" value={String(employmentProfile.branchref)} />
                )}
                {employmentProfile.startDate != null && employmentProfile.startDate !== '' && (
                  <ModalRow label="Start date" value={String(employmentProfile.startDate)} />
                )}
                {employmentProfile.endDate != null && employmentProfile.endDate !== '' && (
                  <ModalRow label="End date" value={String(employmentProfile.endDate)} />
                )}
                {employmentProfile.isCurrentlyEmployed != null && (
                  <ModalRow label="Currently employed" value={employmentProfile.isCurrentlyEmployed ? 'Yes' : 'No'} />
                )}
                {employmentProfile.contactNumber != null && employmentProfile.contactNumber !== '' && (
                  <ModalRow label="Contact number" value={String(employmentProfile.contactNumber)} />
                )}
              </ModalSection>
            )}

            <ModalSection title="Location">
              <ModalRow
                label="Shift address"
                value={
                  user.shiftStartAddress ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(user.shiftStartAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                      title={user.shiftStartAddress}
                    >
                      {user.shiftStartAddress}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <ModalRow
                label="Distance"
                value={
                  user.distanceFromWorkplaceMeters != null
                    ? user.distanceFromWorkplaceMeters >= 1000
                      ? `~${(user.distanceFromWorkplaceMeters / 1000).toFixed(1)} km away`
                      : `~${user.distanceFromWorkplaceMeters} m away`
                    : '—'
                }
              />
            </ModalSection>

            <Separator />

            <ModalSection title="Actions">
              <Link
                href={`/reports/users/${user.ref}/settings`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <SettingsIcon className="size-4 shrink-0" />
                User settings
              </Link>
            </ModalSection>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
