'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/api/client';

/**
 * Returns an Axios instance that injects the current Clerk token on each request.
 * Use this inside components that run under ClerkProvider and QueryClientProvider.
 */
export function useApiClient() {
  const { getToken } = useAuth();
  return useMemo(() => createApiClient(getToken), [getToken]);
}
