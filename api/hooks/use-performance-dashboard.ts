'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getPerformanceDashboard,
  type PerformanceDashboardResponse,
} from '@/api/endpoints/performance-dashboard';

const QUERY_KEY = ['reports', 'performance', 'dashboard'] as const;

export function usePerformanceDashboard(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY, 'allTime'],
    queryFn: async (): Promise<PerformanceDashboardResponse | null> => {
      try {
        return await getPerformanceDashboard(client, { allTime: true });
      } catch {
        return null;
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
