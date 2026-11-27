'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  cancelShopQuotationForClient,
  updateShopQuotationForClient,
} from '@/api/endpoints/shop';
import type { CreateQuotationPayload } from '@/api/endpoints/shop';
import { LINKED_CLIENT_FULL_PROFILE_QUERY_KEY } from '@/api/hooks/use-linked-client-profile';

function invalidateClientProfile(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.invalidateQueries({ queryKey: LINKED_CLIENT_FULL_PROFILE_QUERY_KEY });
}

/** Saves line, delivery, and promo changes on an order the client owns. */
export function useUpdateClientOrder() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quotationId,
      payload,
    }: {
      quotationId: number;
      payload: CreateQuotationPayload;
    }) => updateShopQuotationForClient(apiClient, quotationId, payload),
    onSuccess: () => invalidateClientProfile(queryClient),
  });
}

/** Cancels an order the client owns. */
export function useCancelClientOrder() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: number) =>
      cancelShopQuotationForClient(apiClient, quotationId),
    onSuccess: () => invalidateClientProfile(queryClient),
  });
}
