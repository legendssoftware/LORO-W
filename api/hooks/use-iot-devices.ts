'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  createIotDevice,
  deleteIotDevice,
  getIotDevice,
  listIotDevices,
  updateIotDevice,
  updateIotDeviceStatus,
  type ListIotDevicesParams,
} from '@/api/endpoints/iot';
import type {
  CreateIotDevicePayload,
  UpdateIotDevicePayload,
  UpdateIotDeviceStatusPayload,
} from '@/api/types/iot';
import toast from 'react-hot-toast';
import { getErrorStatus, getQueryErrorMessage } from '@/lib/api/query-error';

export const IOT_DEVICES_QUERY_KEY_PREFIX = ['iot', 'devices'] as const;

const DEFAULT_PAGE_SIZE = 100;

function mutationToastError(err: unknown, fallback: string) {
  const status = getErrorStatus(err);
  const msg = getQueryErrorMessage(err, fallback);
  if (status === 403) {
    toast.error(`${msg} Elevated access may be required for this action.`);
    return;
  }
  toast.error(msg);
}

export function invalidateIotDeviceQueries(
  queryClient: QueryClient,
  opts?: { detailId?: number | null }
) {
  queryClient.invalidateQueries({ queryKey: [...IOT_DEVICES_QUERY_KEY_PREFIX, 'list'] });
  if (opts?.detailId != null) {
    queryClient.invalidateQueries({
      queryKey: [...IOT_DEVICES_QUERY_KEY_PREFIX, 'detail', opts.detailId],
    });
  }
}

export function useIotDevices(
  params?: ListIotDevicesParams,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  const page = params?.page ?? 1;
  const limit = params?.limit ?? DEFAULT_PAGE_SIZE;
  const deviceType = params?.deviceType?.trim() || undefined;
  const status = params?.status?.trim() || undefined;

  return useQuery({
    queryKey: [
      ...IOT_DEVICES_QUERY_KEY_PREFIX,
      'list',
      page,
      limit,
      deviceType ?? '',
      status ?? '',
    ],
    queryFn: async () =>
      listIotDevices(client, { page, limit, deviceType, status }),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useIotDevice(id: number | null, options?: { enabled?: boolean }) {
  const client = useApiClient();
  const enabled = options?.enabled !== false && id != null && id > 0;

  return useQuery({
    queryKey: [...IOT_DEVICES_QUERY_KEY_PREFIX, 'detail', id],
    queryFn: async () => getIotDevice(client, id!),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useCreateIotDeviceMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateIotDevicePayload) => createIotDevice(client, body),
    onSuccess: (res) => {
      toast.success(res.message || 'Device registered');
      invalidateIotDeviceQueries(queryClient);
    },
    onError: (err) => mutationToastError(err, 'Could not create device'),
  });
}

export function useUpdateIotDeviceMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateIotDevicePayload }) =>
      updateIotDevice(client, id, body),
    onSuccess: (res, vars) => {
      toast.success(res.message || 'Device updated');
      invalidateIotDeviceQueries(queryClient, { detailId: vars.id });
    },
    onError: (err) => mutationToastError(err, 'Could not update device'),
  });
}

export function useUpdateIotDeviceStatusMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: UpdateIotDeviceStatusPayload;
    }) => updateIotDeviceStatus(client, id, body),
    onSuccess: (res, vars) => {
      toast.success(res.message || 'Status updated');
      invalidateIotDeviceQueries(queryClient, { detailId: vars.id });
    },
    onError: (err) => mutationToastError(err, 'Could not update status'),
  });
}

export function useDeleteIotDeviceMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteIotDevice(client, id),
    onSuccess: (res, id) => {
      toast.success(res.message || 'Device removed');
      invalidateIotDeviceQueries(queryClient, { detailId: id });
    },
    onError: (err) => mutationToastError(err, 'Could not delete device'),
  });
}
