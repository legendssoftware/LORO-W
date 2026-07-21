'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  planClientVisits,
  type PlanClientVisitsBody,
} from '@/api/endpoints/user';
import { getUserVisitPlanSchedulesQueryKey } from '@/api/hooks/use-user-visit-plan-schedules';

const QUERY_KEY_PREFIX = ['user'] as const;

export function usePlanClientVisitsMutation(userRef: string | number) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PlanClientVisitsBody) =>
      planClientVisits(client, userRef, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...QUERY_KEY_PREFIX, userRef],
      });
      void queryClient.invalidateQueries({
        queryKey: getUserVisitPlanSchedulesQueryKey(userRef),
      });
    },
  });
}
