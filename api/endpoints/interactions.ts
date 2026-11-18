import type { AxiosInstance } from 'axios';
import type {
  InteractionsByLeadResponse,
  CreateInteractionPayload,
  CreateInteractionResponse,
  UploadInteractionAttachmentResponse,
} from '@/api/types/interactions';

/**
 * GET /interactions/lead/:ref - interactions for a lead (team chat).
 */
export async function getInteractionsByLead(
  client: AxiosInstance,
  leadRef: number
): Promise<InteractionsByLeadResponse> {
  const { data } = await client.get<InteractionsByLeadResponse>(
    `/interactions/lead/${leadRef}`
  );
  return data;
}

/**
 * POST /interactions - create an interaction (e.g. lead message).
 * Backend sets createdBy from authenticated user when omitted.
 */
export async function createInteraction(
  client: AxiosInstance,
  payload: CreateInteractionPayload
): Promise<CreateInteractionResponse> {
  const { data } = await client.post<CreateInteractionResponse>(
    '/interactions',
    payload
  );
  return data;
}

/**
 * POST /interactions/upload — multipart file; returns public URL for `attachmentUrl`.
 */
export async function uploadInteractionAttachment(
  client: AxiosInstance,
  file: File
): Promise<UploadInteractionAttachmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post<UploadInteractionAttachmentResponse>(
    '/interactions/upload',
    formData
  );
  return data;
}

/** GET /interactions/client/:ref */
export async function getInteractionsByClient(
  client: AxiosInstance,
  clientRef: number
): Promise<InteractionsByLeadResponse> {
  const { data } = await client.get<InteractionsByLeadResponse>(`/interactions/client/${clientRef}`);
  return data;
}

/** PATCH /interactions/:ref */
export async function updateInteraction(
  client: AxiosInstance,
  ref: number,
  message: string
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(`/interactions/${ref}`, { message });
  return data;
}

/** DELETE /interactions/:ref */
export async function deleteInteraction(
  client: AxiosInstance,
  ref: number
): Promise<{ message: string }> {
  const { data } = await client.delete<{ message: string }>(`/interactions/${ref}`);
  return data;
}
