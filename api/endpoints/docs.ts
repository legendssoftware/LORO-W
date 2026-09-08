import type { AxiosInstance } from 'axios';

/** Response from POST /docs/upload (spread storage result + message). */
export interface DocsUploadResponse {
  message: string;
  fileName: string;
  publicUrl?: string;
  url?: string;
  metadata?: Record<string, unknown>;
  docId?: number;
  originalSize?: number;
  optimizedSize?: number;
  compressionRatio?: number;
}

/**
 * Upload a single file (e.g. logo image). Uses multipart field name `file`.
 * Omit `type` for mixed visit media so the server does not reject HEIC/WebP as "not an image".
 */
export async function uploadDocFile(
  client: AxiosInstance,
  file: File,
  type?: 'image' | string
): Promise<DocsUploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await client.post<DocsUploadResponse>('/docs/upload', form, {
    params: type ? { type } : undefined,
    timeout: 60_000,
    meta: { skipErrorToast: true },
  });
  return data;
}

/**
 * Upload a visit image or document via POST /docs/upload and return the public URL.
 */
export async function uploadVisitFile(
  client: AxiosInstance,
  file: File
): Promise<string> {
  const data = await uploadDocFile(client, file);
  const url = data.publicUrl ?? data.url;
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Upload succeeded but no URL was returned');
  }
  return url;
}
