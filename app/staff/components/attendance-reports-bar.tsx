'use client';

import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSendAttendanceReportMutation } from '@/api/hooks/use-send-attendance-report';
import type { AttendanceReportSendKind } from '@/api/endpoints/attendance';

interface AttendanceReportsBarProps {
  date: string;
  totalEmployees: number;
  presentEmployees: number;
  absentEmployees: number;
  attendanceRate: number;
  isLoading: boolean;
}

/**
 * Today's attendance counts, then the three report sends. Shown only to roles that edit attendance.
 */
export function AttendanceReportsBar({
  date,
  totalEmployees,
  presentEmployees,
  absentEmployees,
  attendanceRate,
  isLoading,
}: AttendanceReportsBarProps) {
  const send = useSendAttendanceReportMutation();

  function sendReport(kind: AttendanceReportSendKind) {
    send.mutate(kind);
  }

  const sending = send.isPending ? send.variables : null;

  return (
    <section className="shrink-0 mb-6 rounded-lg border" aria-label="Daily attendance overview">
      <div className="flex flex-col gap-4 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-medium text-foreground">Daily overview</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Present</dt>
              <dd className="font-medium text-foreground">{isLoading ? '—' : presentEmployees}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Absent</dt>
              <dd className="font-medium text-foreground">{isLoading ? '—' : absentEmployees}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total</dt>
              <dd className="font-medium text-foreground">{isLoading ? '—' : totalEmployees}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Rate</dt>
              <dd className="font-medium text-foreground">
                {isLoading ? '—' : `${Math.round(attendanceRate)}%`}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2 !rounded px-3"
            disabled={send.isPending}
            aria-label="Send morning attendance report"
            onClick={() => sendReport('morning')}
          >
            <Mail className="size-4" />
            {sending === 'morning' ? 'Sending…' : 'Morning report'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2 !rounded px-3"
            disabled={send.isPending}
            aria-label="Send evening attendance report"
            onClick={() => sendReport('evening')}
          >
            <Mail className="size-4" />
            {sending === 'evening' ? 'Sending…' : 'Evening report'}
          </Button>
          <Button
            type="button"
            className="h-9 gap-2 border-0 !rounded bg-violet-600 px-3 text-white hover:bg-violet-700 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500 [&_svg]:text-white"
            disabled={send.isPending}
            aria-label="Send daily absence report"
            onClick={() => sendReport('absence-daily')}
          >
            <Mail className="size-4" />
            {sending === 'absence-daily' ? 'Sending…' : 'Absence report'}
          </Button>
        </div>
      </div>
    </section>
  );
}
