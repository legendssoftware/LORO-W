'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  convertQuotation,
  getQuotationConversionStatus,
  rollbackQuotationConversion,
} from '@/api/endpoints/quotation-conversion';

export function useQuotationConversionStatus(
  ref: number | string | null | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['quotations', 'conversion', ref ?? 'none'],
    queryFn: () => getQuotationConversionStatus(client, ref!),
    enabled: options?.enabled !== false && ref != null && ref !== '',
    staleTime: 30 * 1000,
  });
}

export function useConvertQuotationMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => convertQuotation(client, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });
}

export function useRollbackQuotationMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: number | string) => rollbackQuotationConversion(client, ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
}
