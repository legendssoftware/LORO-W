import type { AxiosInstance } from 'axios';
import type {
  AssignableOrder,
  CreateDeliveryBody,
  DeliveryDetail,
  DeliveryListQuery,
  DeliveryListResponse,
  DeliveryPdfResponse,
  DriverOption,
  PublicDelivery,
  PublicRatingResponse,
  SubmitDeliveryRatingBody,
} from '@/api/types/epod';

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4400';

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

async function readPublicJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  if (!res.ok) {
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

/** GET /epod/public/:token — customer tracking page. No login. */
export async function getPublicDelivery(token: string): Promise<PublicDelivery> {
  const res = await fetch(`${PUBLIC_API_URL}/epod/public/${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  return readPublicJson<PublicDelivery>(res);
}

/** POST /epod/public/:token/rating — one score after the proof is recorded. */
export async function submitPublicDeliveryRating(
  token: string,
  body: SubmitDeliveryRatingBody,
): Promise<PublicRatingResponse> {
  const res = await fetch(`${PUBLIC_API_URL}/epod/public/${encodeURIComponent(token)}/rating`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return readPublicJson<PublicRatingResponse>(res);
}

/** GET /epod/assignable-orders — orders that may still be assigned to a driver. */
export async function listAssignableOrders(client: AxiosInstance): Promise<AssignableOrder[]> {
  const { data } = await client.get<AssignableOrder[]>('/epod/assignable-orders');
  return Array.isArray(data) ? data : [];
}
