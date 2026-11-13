'use client';

import { useQuery } from '@tanstack/react-query';
import type { AxiosInstance } from 'axios';
import type { ImportBookSummary } from '@/app/reports/lib/reports-target-row';

const CHUNK = 200;

export type LeadIngestionOwner = ImportBookSummary & { userId: number };

type LeadIngestionResponse = {
  owners?: LeadIngestionOwner[];
};

/**
 * Lifetime import books for the given users. Not keyed by the report date range.
 */
export function useLeadIngestion(opts: {
  client: AxiosInstance;
  userIds: number[];
  enabled: boolean;
}) {
  const ids = [...new Set(opts.userIds.filter((id) => id > 0))].sort((a, b) => a - b);
  const signature = ids.join(',');
  return useQuery({
    queryKey: ['reports', 'lead-ingestion', signature],
    enabled: opts.enabled && ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const byUserId = new Map<number, ImportBookSummary>();
      for (let offset = 0; offset < ids.length; offset += CHUNK) {
        const userIds = ids.slice(offset, offset + CHUNK);
        const { data } = await opts.client.post<LeadIngestionResponse>('/reports/lead-ingestion', {
          userIds,
        });
        for (const owner of data.owners ?? []) {
          byUserId.set(owner.userId, owner);
        }
      }
      return byUserId;
    },
  });
}
