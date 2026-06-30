'use client';

import { useMutation } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  planClientVisits,
  type PlanClientVisitsBody,
} from '@/api/endpoints/user';

export function usePlanClientVisitsMutation(userRef: string | number) {
  const client = useApiClient();

  return useMutation({
    mutationFn: (body: PlanClientVisitsBody) =>
      planClientVisits(client, userRef, body),
  });
}
