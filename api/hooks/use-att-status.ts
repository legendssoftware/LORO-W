'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getAttStatus } from '@/api/endpoints/attendance';
import type { AttStatusResponse } from '@/api/types';

/** Re-export visit mutations for visits page (start/end visit, not shift) */
export {
  useCheckInMutation,
  useCheckOutMutation,
  useUpdateVisitDetailsMutation,
} from './use-check-in-mutations';

/** Re-export attendance mutations for dashboard (start/end shift) */
export {
  useAttCheckInMutation,
  useAttCheckOutMutation,
  useBreakMutation,
} from './use-attendance-mutations';

/** Attendance status (shift checked in/out). Uses GET /att/status – not visits. */
export function useAttStatus(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['att-status'],
    queryFn: async (): Promise<AttStatusResponse> => {
      const data = await getAttStatus(client);
      return {
        ...data,
        nextAction: data?.nextAction ?? (data?.checkedIn ? 'End Shift' : 'Start Shift'),
        checkedIn: data?.checkedIn === true,
      };
    },
    enabled: options?.enabled !== false,
  });
}
