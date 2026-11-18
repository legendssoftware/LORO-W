import type { AxiosInstance } from 'axios';

export interface GeofenceArea {
  uid?: number;
  ref?: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive?: boolean;
}

export async function listGeofences(client: AxiosInstance): Promise<GeofenceArea[]> {
  const { data } = await client.get<{ data?: GeofenceArea[] } | GeofenceArea[]>('/geofence');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function listGeofenceAreas(client: AxiosInstance): Promise<GeofenceArea[]> {
  const { data } = await client.get<{ data?: GeofenceArea[] } | GeofenceArea[]>('/geofence/areas');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function createGeofence(
  client: AxiosInstance,
  payload: Pick<GeofenceArea, 'name' | 'latitude' | 'longitude' | 'radius' | 'description'>
): Promise<{ message?: string }> {
  const { data } = await client.post('/geofence', payload);
  return data;
}

export async function updateGeofence(
  client: AxiosInstance,
  ref: number | string,
  payload: Partial<Pick<GeofenceArea, 'name' | 'latitude' | 'longitude' | 'radius' | 'description'>>
): Promise<{ message?: string }> {
  const { data } = await client.patch(`/geofence/${ref}`, payload);
  return data;
}

export async function deleteGeofence(client: AxiosInstance, ref: number | string): Promise<{ message?: string }> {
  const { data } = await client.delete(`/geofence/${ref}`);
  return data;
}

export async function listGeofenceEvents(
  client: AxiosInstance,
  ref: number | string
): Promise<Array<{ uid?: number; eventType?: string; timestamp?: string }>> {
  const { data } = await client.get(`/geofence/events/geofence/${ref}`);
  if (Array.isArray(data)) return data;
  return data?.data ?? data?.events ?? [];
}
