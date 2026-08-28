import type { AxiosInstance } from 'axios';
import type {
  CallRecordingDetailResponse,
  CallRecordingListResponse,
  CallRetryTranscriptResponse,
  CallStartPayload,
  CallStartResponse,
  GetCallsParams,
} from '@/api/types/calls';

export async function getCalls(
  client: AxiosInstance,
  params: GetCallsParams = {},
): Promise<CallRecordingListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);
  if (params.search) search.set('search', params.search);
  if (params.origin) search.set('origin', params.origin);
  if (params.ownerClerkUserId) search.set('ownerClerkUserId', params.ownerClerkUserId);
  if (params.callType) search.set('callType', params.callType);
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  if (params.branchId != null) search.set('branchId', String(params.branchId));
  const qs = search.toString();
  const { data } = await client.get<CallRecordingListResponse>(`/calls${qs ? `?${qs}` : ''}`);
  return data;
}

export async function getCall(
  client: AxiosInstance,
  uid: string,
): Promise<CallRecordingDetailResponse> {
  const { data } = await client.get<CallRecordingDetailResponse>(`/calls/${uid}`);
  return data;
}

export async function retryCallTranscript(
  client: AxiosInstance,
  uid: string,
): Promise<CallRetryTranscriptResponse> {
  const { data } = await client.post<CallRetryTranscriptResponse>(`/calls/${uid}/retry-transcript`);
  return data;
}

/**
 * Score a ready transcript with Gemini. Does not re-download audio or re-transcribe.
 */
export async function rateCallConversation(
  client: AxiosInstance,
  uid: string,
): Promise<CallRecordingDetailResponse> {
  const { data } = await client.post<CallRecordingDetailResponse>(`/calls/${uid}/rate`);
  return data;
}

/**
 * Download PBX audio into GCS when missing and return a signed playback URL.
 * Does not change transcript status.
 */
export async function ensureCallAudio(
  client: AxiosInstance,
  uid: string,
): Promise<CallRecordingDetailResponse> {
  const { data } = await client.post<CallRecordingDetailResponse>(`/calls/${uid}/ensure-audio`);
  return data;
}

export async function startCompanyCall(
  client: AxiosInstance,
  payload: CallStartPayload,
): Promise<CallStartResponse> {
  const { data } = await client.post<CallStartResponse>('/calls/start', payload);
  return data;
}
