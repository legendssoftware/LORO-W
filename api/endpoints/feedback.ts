import type { AxiosInstance } from 'axios';

export interface FeedbackItem {
  uid?: number;
  id?: number;
  title?: string;
  comments?: string;
  status?: string;
  type?: string;
  rating?: number;
}

export async function listFeedback(
  client: AxiosInstance,
  params: { status?: string; page?: number; limit?: number } = {}
): Promise<FeedbackItem[]> {
  const { data } = await client.get<{ data?: FeedbackItem[] } | FeedbackItem[]>('/feedback', { params });
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function getFeedbackStats(
  client: AxiosInstance,
  organisationId: number | string
): Promise<{ total?: number; byStatus?: Array<{ name: string; value: number }> | Record<string, number> }> {
  const { data } = await client.get('/feedback/stats', { params: { organisationId } });
  return data ?? {};
}

export async function updateFeedback(
  client: AxiosInstance,
  id: number,
  payload: { status?: string; responseText?: string }
): Promise<{ message?: string }> {
  const { data } = await client.patch(`/feedback/${id}`, payload);
  return data;
}
