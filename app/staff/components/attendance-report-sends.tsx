'use client';

import type { ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sunrise, Sunset, UserX } from 'lucide-react';
import { useApiClient, useSessionSync } from '@/api/hooks';
import {
  sendAbsenceAttendanceReport,
  sendEveningAttendanceReport,
  sendMorningAttendanceReport,
} from '@/api/endpoints/attendance';
import type { DailyOverviewResponse } from '@/api/types';
import { Button } from '@/components/ui/button';
import { canSendAttendanceReports } from '@/lib/access';
import toast from 'react-hot-toast';

/**
 * Daily attendance totals. Clock-in stays on the phone app.
 */
export function AttendanceReportOverview({
  overview,
}: {
  overview?: DailyOverviewResponse['data'];
}) {
  return (
    <p className="mb-4 text-xs text-muted-foreground">
      {overview
        ? `Daily overview ${overview.date}: ${overview.presentEmployees} present, ${overview.absentEmployees} absent, ${overview.attendanceRate}% attendance.`
        : 'Daily overview loads with the staff list.'}
    </p>
  );
}

/** Morning, evening, and absence sends. Place these on the staff filter row. */
export function AttendanceReportButtons() {
  const client = useApiClient();
  const { backendUserData } = useSessionSync();
  if (!canSendAttendanceReports(backendUserData?.accessLevel)) return null;

  return (
    <>
      <ReportButton
        label="Morning"
        icon={<Sunrise className="size-4" />}
        send={sendMorningAttendanceReport}
        client={client}
        pendingLabel="Could not send the morning report"
        successLabel="Morning report sent"
      />
      <ReportButton
        label="Evening"
        icon={<Sunset className="size-4" />}
        send={sendEveningAttendanceReport}
        client={client}
        pendingLabel="Could not send the evening report"
        successLabel="Evening report sent"
      />
      <ReportButton
        label="Absence"
        icon={<UserX className="size-4" />}
        send={sendAbsenceAttendanceReport}
        client={client}
        pendingLabel="Could not send the absence report"
        successLabel="Absence report sent"
      />
    </>
  );
}

function ReportButton({
  label,
  icon,
  send,
  client,
  successLabel,
  pendingLabel,
}: {
  label: string;
  icon: ReactNode;
  send: (client: ReturnType<typeof useApiClient>) => Promise<{ message: string }>;
  client: ReturnType<typeof useApiClient>;
  successLabel: string;
  pendingLabel: string;
}) {
  const mutation = useMutation({
    mutationFn: () => send(client),
    onSuccess: (result) => toast.success(result.message || successLabel),
    onError: () => toast.error(pendingLabel),
  });
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-9 shrink-0 gap-2"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {icon}
      {label}
    </Button>
  );
}
