import type { AxiosInstance } from 'axios';
import type {
  CreateDeviceResponse,
  CreateIotDevicePayload,
  IotDevice,
  IotDevicesListResponse,
  UpdateIotDevicePayload,
  UpdateIotDeviceStatusPayload,
} from '@/api/types/iot';

export interface ListIotDevicesParams {
  page?: number;
  limit?: number;
  deviceType?: string;
  status?: string;
}

export async function listIotDevices(
  client: AxiosInstance,
  params?: ListIotDevicesParams
): Promise<IotDevicesListResponse> {
  const { data } = await client.get<IotDevicesListResponse>('/iot/devices', {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 100,
      ...(params?.deviceType && { deviceType: params.deviceType }),
      ...(params?.status && { status: params.status }),
    },
  });
  return data;
}

export async function getIotDevice(
  client: AxiosInstance,
  id: number
): Promise<IotDevice> {
  const { data } = await client.get<{ device: IotDevice | null; message: string }>(
    `/iot/devices/${id}`
  );
  if (!data.device) {
    throw new Error(data.message || 'Device not found');
  }
  return data.device;
}

export async function createIotDevice(
  client: AxiosInstance,
  body: CreateIotDevicePayload
): Promise<CreateDeviceResponse> {
  const { data } = await client.post<CreateDeviceResponse>('/iot/devices', body);
  return data;
}

export async function updateIotDevice(
  client: AxiosInstance,
  id: number,
  body: UpdateIotDevicePayload
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(
    `/iot/devices/${id}`,
    body
  );
  return data;
}

export async function updateIotDeviceStatus(
  client: AxiosInstance,
  id: number,
  body: UpdateIotDeviceStatusPayload
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(
    `/iot/devices/${id}/status`,
    body
  );
  return data;
}

export async function deleteIotDevice(
  client: AxiosInstance,
  id: number
): Promise<{ message: string }> {
  const { data } = await client.delete<{ message: string }>(
    `/iot/devices/${id}`
  );
  return data;
}
