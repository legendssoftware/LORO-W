'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { DAILY_OVERVIEW_QUERY_KEY_PREFIX } from '@/api/hooks/use-daily-overview';
import {
  checkIn,
  checkOut,
  manageBreak,
  adjustUserAttendanceRecord,
  type AdjustUserAttendanceRecordBody,
} from '@/api/endpoints/attendance';
import type { CheckInBody, CheckOutBody, BreakBody } from '@/api/types';

const ATT_STATUS_QUERY_KEY = ['att-status'] as const;
const ATT_METRICS_QUERY_KEY = ['att', 'metrics'] as const;
const ATT_MONTHLY_QUERY_KEY = ['att', 'monthly'] as const;
const ATT_PAYROLL_QUERY_KEY = ['att', 'payroll-hours'] as const;

function invalidateAttendanceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ATT_STATUS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ATT_METRICS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ATT_MONTHLY_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ATT_PAYROLL_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: DAILY_OVERVIEW_QUERY_KEY_PREFIX });
}

/**
 * Mutation for starting a shift (attendance check-in).
 * Calls POST /att/in - does NOT create a visit.
 */
export function useAttCheckInMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CheckInBody) => {
      const data = await checkIn(client, payload);
      return data;
    },
    onSuccess: () => {
      invalidateAttendanceQueries(queryClient);
    },
  });
}

/**
 * Mutation for ending a shift (attendance check-out).
 * Calls POST /att/out - does NOT affect visits.
 */
export function useAttCheckOutMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CheckOutBody) => {
      const data = await checkOut(client, payload);
      return data;
    },
    onSuccess: () => {
      invalidateAttendanceQueries(queryClient);
    },
  });
}

/**
 * Mutation for starting or ending a break.
 * Calls POST /att/break.
 */
export function useBreakMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BreakBody) => {
      const data = await manageBreak(client, payload);
      return data;
    },
    onSuccess: () => {
      invalidateAttendanceQueries(queryClient);
    },
  });
}

/**
 * Mutation for admin correction of a user's check-in/out on one calendar day.
 * Calls PATCH /att/user/:ref/record.
 */
export function useAdjustUserAttendanceRecordMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      ref: string | number;
      body: AdjustUserAttendanceRecordBody;
    }) => adjustUserAttendanceRecord(client, payload.ref, payload.body),
    onSuccess: () => {
      invalidateAttendanceQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['att', 'metrics', 'monthly'] });
    },
  });
}
