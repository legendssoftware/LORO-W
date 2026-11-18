'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sendAttendanceReport, type AttendanceReportSendKind } from '@/api/endpoints/attendance';
import { useApiClient } from './use-api-client';

function reportLabel(kind: AttendanceReportSendKind): string {
  if (kind === 'morning') return 'Morning report';
  if (kind === 'evening') return 'Evening report';
  return 'Absence report';
}

/**
 * Sends one attendance email report. The server answers 200 even when the send fails,
 * so a message that starts with "Error" or sent === false is treated as a failure.
 */
export function useSendAttendanceReportMutation() {
  const client = useApiClient();
  return useMutation({
    mutationFn: (kind: AttendanceReportSendKind) => sendAttendanceReport(client, kind),
    onSuccess: (data, kind) => {
      const failed = data.sent === false || data.message.trim().toLowerCase().startsWith('error');
      if (failed) {
        toast.error(data.message || `${reportLabel(kind)} could not be sent.`);
        return;
      }
      toast.success(data.message || `${reportLabel(kind)} sent.`);
    },
    onError: () => {
      toast.error('Could not send the attendance report.');
    },
  });
}
