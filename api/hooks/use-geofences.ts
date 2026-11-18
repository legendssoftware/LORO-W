'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  createGeofence,
  deleteGeofence,
  listGeofenceAreas,
  listGeofenceEvents,
  listGeofences,
  updateGeofence,
} from '@/api/endpoints/geofences';

export const GEOFENCE_QUERY_KEY = ['geofence'] as const;

export function useGeofences(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: GEOFENCE_QUERY_KEY,
    queryFn: () => listGeofences(client),
    enabled: options?.enabled !== false,
  });
}

export function useGeofenceAreas(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...GEOFENCE_QUERY_KEY, 'areas'],
    queryFn: () => listGeofenceAreas(client),
    enabled: options?.enabled !== false,
  });
}

export function useGeofenceEvents(ref: number | string | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...GEOFENCE_QUERY_KEY, 'events', ref],
    queryFn: () => listGeofenceEvents(client, ref!),
    enabled: options?.enabled !== false && ref != null,
  });
}

export function useSaveGeofenceMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ref?: number | string; name: string; latitude: number; longitude: number; radius: number }) =>
      input.ref
        ? updateGeofence(client, input.ref, input)
        : createGeofence(client, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GEOFENCE_QUERY_KEY }),
  });
}

export function useDeleteGeofenceMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: number | string) => deleteGeofence(client, ref),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GEOFENCE_QUERY_KEY }),
  });
}
