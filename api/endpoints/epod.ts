import type { AxiosInstance } from 'axios';
import type {
  AssignableOrder,
  CreateDeliveryBody,
  DeliveryDetail,
  DeliveryListQuery,
  DeliveryListResponse,
  DeliveryPdfResponse,
  DriverOption,
} from '@/api/types/epod';

/**
 * GET /epod/deliveries — dispatchers see the organisation, a driver only sees their own stops.
 */
export async function listDeliveries(
  client: AxiosInstance,
  query: DeliveryListQuery = {},
): Promise<DeliveryListResponse> {
  const { data } = await client.get<DeliveryListResponse>('/epod/deliveries', {
    params: {
      ...(query.date ? { date: query.date } : {}),
      ...(query.driverUid != null ? { driverUid: query.driverUid } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
  });
  return data ?? { deliveries: [] };
}

/** GET /epod/deliveries/:uid — includes the recorded proof once the driver has submitted. */
export async function getDelivery(client: AxiosInstance, uid: number): Promise<DeliveryDetail> {
  const { data } = await client.get<DeliveryDetail>(`/epod/deliveries/${uid}`);
  return data;
}

/** POST /epod/deliveries — assigns a shop order to a driver and moves the order out for delivery. */
export async function createDelivery(
  client: AxiosInstance,
  body: CreateDeliveryBody,
): Promise<DeliveryDetail> {
  const { data } = await client.post<DeliveryDetail>('/epod/deliveries', body);
  return data;
}

/** POST /epod/deliveries/:uid/cancel — dispatchers only, and only before the proof is recorded. */
export async function cancelDelivery(client: AxiosInstance, uid: number): Promise<DeliveryDetail> {
  const { data } = await client.post<DeliveryDetail>(`/epod/deliveries/${uid}/cancel`, {});
  return data;
}

/** GET /epod/deliveries/:uid/pdf — returns the stored URL, generating the file when it is missing. */
export async function getDeliveryPdf(client: AxiosInstance, uid: number): Promise<DeliveryPdfResponse> {
  const { data } = await client.get<DeliveryPdfResponse>(`/epod/deliveries/${uid}/pdf`);
  return data;
}

/** GET /epod/drivers — staff whose workforce type or role is driver. */
export async function listDrivers(client: AxiosInstance): Promise<DriverOption[]> {
  const { data } = await client.get<DriverOption[]>('/epod/drivers');
  return Array.isArray(data) ? data : [];
}

/** GET /epod/assignable-orders — orders that may still be assigned to a driver. */
export async function listAssignableOrders(client: AxiosInstance): Promise<AssignableOrder[]> {
  const { data } = await client.get<AssignableOrder[]>('/epod/assignable-orders');
  return Array.isArray(data) ? data : [];
}
