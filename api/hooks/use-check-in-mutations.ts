'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type {
  CreateCheckInPayload,
  CreateCheckOutPayload,
  CheckInResponse,
  CheckOutResponse,
  UpdateVisitDetailsPayload,
} from '@/api/types/visits';

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function getAuthFetch(token: string | null) {
  if (!token) throw new Error('Not authenticated');
  return (path: string, init?: RequestInit) =>
    fetch(`${DEFAULT_API_URL}${path}`.replace(/([^:]\/)\/+/g, '$1'), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
}

export function useCheckInMutation() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCheckInPayload) => {
      const token = await getToken();
      const authFetch = await getAuthFetch(token);
      const res = await authFetch('/check-ins', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data: CheckInResponse = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || res.statusText || 'Check-in failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-ins'] });
      queryClient.invalidateQueries({ queryKey: ['check-in-status'] });
    },
  });
}

export function useCheckOutMutation() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCheckOutPayload) => {
      const token = await getToken();
      const authFetch = await getAuthFetch(token);
      // Backend finds active check-in by user; use 'me' as reference.
      const res = await authFetch('/check-ins/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data: CheckOutResponse = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || res.statusText || 'Check-out failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-ins'] });
      queryClient.invalidateQueries({ queryKey: ['check-in-status'] });
    },
  });
}

export function useUpdateVisitDetailsMutation() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateVisitDetailsPayload) => {
      const token = await getToken();
      const authFetch = await getAuthFetch(token);
      const res = await authFetch('/check-ins/visit-details', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data: { message?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || res.statusText || 'Failed to update visit details');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-ins'] });
      queryClient.invalidateQueries({ queryKey: ['check-in-status'] });
    },
  });
}

