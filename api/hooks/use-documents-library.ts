'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { createDocumentRecord, listDocuments } from '@/api/endpoints/documents-library';

export function useDocumentsLibrary(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['docs', 'library'],
    queryFn: () => listDocuments(client),
    enabled: options?.enabled !== false,
  });
}

export function useCreateDocumentRecordMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof createDocumentRecord>[1]) => createDocumentRecord(client, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['docs', 'library'] }),
  });
}
