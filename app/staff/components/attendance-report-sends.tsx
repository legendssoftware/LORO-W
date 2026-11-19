'use client';

import { useMutation } from '@tanstack/react-query';
import { ChevronDown, Sunrise, Sunset, UserX } from 'lucide-react';
import { useApiClient, useSessionSync } from '@/api/hooks';
import {
  sendAbsenceAttendanceReport,
  sendEveningAttendanceReport,
  sendMorningAttendanceReport,
} from '@/api/endpoints/attendance';
import type { DailyOverviewResponse } from '@/api/types';
import { reportsFilterPortalHighZ } from '@/components/filters/searchable-filter-comboboxes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { canSendAttendanceReports } from '@/lib/access';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

type ApiClient = ReturnType<typeof useApiClient>;

/**
 * Daily attendance totals. Clock-in stays on the phone app.
 */
export function AttendanceReportOverview({
  overview,
}: {
  overview?: DailyOverviewResponse['data'];
}) {
  const { t } = useTranslation('screens');
  return (
    <p className="mb-4 text-xs text-muted-foreground">
      {overview
        ? t('chrome.staff.attendance.dailyOverview', {
            date: overview.date,
            present: overview.presentEmployees,
            absent: overview.absentEmployees,
            rate: overview.attendanceRate,
          })
        : t('chrome.staff.attendance.dailyOverviewLoading')}
    </p>
  );
}

/**
 * Sends a morning, evening, or absence attendance report and toasts the result.
 */
function useReportSend(
  send: (client: ApiClient) => Promise<{ message: string }>,
  client: ApiClient,
  successLabel: string,
  errorLabel: string,
) {
  return useMutation({
    mutationFn: () => send(client),
    onSuccess: (result) => toast.success(result.message || successLabel),
    onError: () => toast.error(errorLabel),
  });
}

/** Morning, evening, and absence sends. Place this on the staff filter row. */
export function AttendanceReportButtons() {
  const { t } = useTranslation('screens');
  const client = useApiClient();
  const { backendUserData } = useSessionSync();
  const morning = useReportSend(
    sendMorningAttendanceReport,
    client,
    t('chrome.staff.attendance.morningSent'),
    t('chrome.staff.attendance.morningError'),
  );
  const evening = useReportSend(
    sendEveningAttendanceReport,
    client,
    t('chrome.staff.attendance.eveningSent'),
    t('chrome.staff.attendance.eveningError'),
  );
  const absence = useReportSend(
    sendAbsenceAttendanceReport,
    client,
    t('chrome.staff.attendance.absenceSent'),
    t('chrome.staff.attendance.absenceError'),
  );

  if (!canSendAttendanceReports(backendUserData?.accessLevel)) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 shrink-0 gap-2"
        >
          {t('chrome.staff.attendance.reports')}
          <ChevronDown className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={reportsFilterPortalHighZ}>
        <DropdownMenuItem
          disabled={morning.isPending}
          onSelect={() => morning.mutate()}
        >
          <Sunrise className="size-4" aria-hidden />
          {t('chrome.staff.attendance.morning')}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={evening.isPending}
          onSelect={() => evening.mutate()}
        >
          <Sunset className="size-4" aria-hidden />
          {t('chrome.staff.attendance.evening')}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={absence.isPending}
          onSelect={() => absence.mutate()}
        >
          <UserX className="size-4" aria-hidden />
          {t('chrome.staff.attendance.absence')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
