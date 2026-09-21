import type { AxiosInstance } from 'axios';
import type {
  PulseCorrelationsResponse,
  PulseDailyResponse,
  PulseExecutiveResponse,
  PulseInsightsResponse,
  PulseMeResponse,
  PulseSubmitBody,
  PulseSubmitResponse,
} from '@/api/types/pulse';

export async function submitPulse(
  client: AxiosInstance,
  body: PulseSubmitBody
): Promise<PulseSubmitResponse> {
  const { data } = await client.post<PulseSubmitResponse>('/pulse', body);
  return data;
}

export async function getPulseMe(
  client: AxiosInstance,
  date?: string
): Promise<PulseMeResponse> {
  const { data } = await client.get<PulseMeResponse>('/pulse/me', {
    params: date ? { date } : undefined,
  });
  return data;
}

export async function getPulseDaily(
  client: AxiosInstance,
  params: { date?: string; branchUid?: number } = {}
): Promise<PulseDailyResponse> {
  const { data } = await client.get<PulseDailyResponse>('/pulse/daily', { params });
  return data;
}

export async function getPulseInsights(
  client: AxiosInstance,
  params: { from?: string; to?: string; branchUid?: number } = {}
): Promise<PulseInsightsResponse> {
  const { data } = await client.get<PulseInsightsResponse>('/pulse/insights', { params });
  return data;
}

export async function getPulseExecutive(
  client: AxiosInstance,
  params: { from?: string; to?: string; branchUid?: number } = {}
): Promise<PulseExecutiveResponse> {
  const { data } = await client.get<PulseExecutiveResponse>('/pulse/executive', { params });
  return data;
}

export async function getPulseCorrelations(
  client: AxiosInstance,
  params: { from?: string; to?: string; branchUid?: number } = {}
): Promise<PulseCorrelationsResponse> {
  const { data } = await client.get<PulseCorrelationsResponse>('/pulse/correlations', {
    params,
  });
  return data;
}
