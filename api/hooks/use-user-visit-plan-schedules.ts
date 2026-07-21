'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getUserVisitPlanSchedules } from '@/api/endpoints/user';

export const USER_VISIT_PLAN_SCHEDULES_QUERY_KEY = [
  'user',
  'visit-plan-schedules',
] as const;

export function getUserVisitPlanSchedulesQueryKey(userRef: string | number) {
  return [...USER_VISIT_PLAN_SCHEDULES_QUERY_KEY, userRef] as const;
}

export function useUserVisitPlanSchedules(
  userRef: string | number | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();

  return useQuery({
    queryKey: getUserVisitPlanSchedulesQueryKey(userRef ?? 'none'),
    queryFn: () => getUserVisitPlanSchedules(client, userRef!),
    enabled: (options?.enabled !== false) && !!userRef,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
