'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getFuelBalance, getFuelBalances } from '@/api/endpoints/fuel-allowance';

export const FUEL_BALANCES_QUERY_KEY = ['user', 'fuel-balances'] as const;

export function fuelBalanceQueryKey(ref: string | number) {
  return ['user', 'fuel-balance', String(ref)] as const;
}

/** Org fuel balances for the staff list. */
export function useFuelBalances(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: FUEL_BALANCES_QUERY_KEY,
    queryFn: () => getFuelBalances(client),
    enabled: options?.enabled !== false,
    staleTime: 60_000,
  });
}

/** One user’s allowance, spend, and day rows for settings. */
export function useFuelBalance(ref: string | number | null | undefined, options?: { enabled?: boolean }) {
  const client = useApiClient();
  const ready = ref != null && String(ref).length > 0;
  return useQuery({
    queryKey: fuelBalanceQueryKey(ref ?? ''),
    queryFn: () => getFuelBalance(client, ref as string | number),
    enabled: options?.enabled !== false && ready,
    staleTime: 60_000,
  });
}
