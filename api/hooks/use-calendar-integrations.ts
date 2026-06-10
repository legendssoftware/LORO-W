'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';
import { useTokenReady } from './use-token-ready';
import {
  deleteCalendarConnection,
  getCalendarIntegrationsStatus,
  postCalendarConnect,
  postCalendarSyncBackfill,
  type CalendarProvider,
} from '../endpoints/calendar-integrations';

export const CALENDAR_INTEGRATIONS_QUERY_KEY = ['calendar-integrations', 'status'] as const;

export function useCalendarIntegrationsStatus() {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();

  return useQuery({
    queryKey: CALENDAR_INTEGRATIONS_QUERY_KEY,
    queryFn: () => getCalendarIntegrationsStatus(client),
    enabled: isTokenReady,
  });
}

export function useCalendarConnect() {
  const client = useApiClient();

  return useMutation({
    mutationFn: (provider: CalendarProvider) => postCalendarConnect(client, provider),
    onSuccess: (data) => {
      if (data.url && typeof window !== 'undefined') {
        window.location.href = data.url;
      }
    },
  });
}

export function useCalendarDisconnect() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      provider,
      deleteEvents,
    }: {
      provider: CalendarProvider;
      deleteEvents?: boolean;
    }) => deleteCalendarConnection(client, provider, deleteEvents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_INTEGRATIONS_QUERY_KEY });
    },
  });
}

export function useCalendarSyncBackfill() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: CalendarProvider) => postCalendarSyncBackfill(client, provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_INTEGRATIONS_QUERY_KEY });
    },
  });
}
