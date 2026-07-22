'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useOrgId, useActiveClerkOrganizationId } from '@/lib/org-id-context';
import { getClerkTokenParams } from '@/lib/clerk-session-token';
import { latestRepLocationsQueryKey } from '@/api/hooks/use-latest-rep-locations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4400';

/** Subscribe to SSE location updates and invalidate latest-rep-locations queries. */
export function useRepLocationStream(options?: {
  enabled?: boolean;
  maxAgeHours?: number;
}) {
  const { getToken } = useAuth();
  const orgId = useOrgId();
  const activeClerkOrganizationId = useActiveClerkOrganizationId();
  const queryClient = useQueryClient();
  const enabled = options?.enabled !== false;
  const maxAgeHours = options?.maxAgeHours ?? 2;

  useEffect(() => {
    if (!enabled) return;

    let aborted = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function connect() {
      try {
        const token = await getToken(
          getClerkTokenParams(orgId, activeClerkOrganizationId)
        );
        if (!token || aborted) return;

        const response = await fetch(`${API_URL}/gps/locations/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
        });

        if (!response.ok || !response.body || aborted) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() ?? '';

          for (const chunk of chunks) {
            if (!chunk.includes('data:')) continue;
            void queryClient.invalidateQueries({
              queryKey: latestRepLocationsQueryKey({ maxAgeHours }),
            });
          }
        }
      } catch {
        // Reconnect below
      }

      if (!aborted) {
        reconnectTimer = setTimeout(() => void connect(), 5000);
      }
    }

    void connect();

    return () => {
      aborted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [
    enabled,
    getToken,
    orgId,
    activeClerkOrganizationId,
    queryClient,
    maxAgeHours,
  ]);
}
