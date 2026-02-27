'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useCheckInMutation, useCheckOutMutation } from './use-check-in-mutations';

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/** Re-export mutations for backward compatibility */
export {
  useCheckInMutation,
  useCheckOutMutation,
  useUpdateVisitDetailsMutation,
} from './use-check-in-mutations';

/** Attendance status (e.g. checked in / checked out). Stub that uses check-in status when available. */
export function useAttStatus(options?: { enabled?: boolean }) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['att-status'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return { nextAction: 'Check In', checkedIn: false };
      const res = await fetch(`${DEFAULT_API_URL}/check-ins/status/me`.replace(/([^:]\/)\/+/g, '$1'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      return {
        nextAction: data?.nextAction ?? 'Check In',
        checkedIn: data?.checkedIn === true,
        ...data,
      };
    },
    enabled: options?.enabled !== false && !!DEFAULT_API_URL,
  });
}

/** Break mutation stub – no-op if not used by app */
export function useBreakMutation() {
  return useMutation({
    mutationFn: async (_payload?: unknown) => ({ message: 'OK' }),
  });
}
