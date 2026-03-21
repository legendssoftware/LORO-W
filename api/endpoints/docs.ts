import type { AxiosInstance } from 'axios';

/** Response from POST /docs/upload (spread storage result + message). */
export interface DocsUploadResponse {
  message: string;
  fileName: string;
  publicUrl: string;
  metadata?: Record<string, unknown>;
  docId?: number;
  originalSize?: number;
  optimizedSize?: number;
  compressionRatio?: number;
}

/**
 * Upload a single file (e.g. logo image). Uses multipart field name `file`.
 * Requires org context + feature access on the server (`claims` for docs routes).
 */
export async function uploadDocFile(
  client: AxiosInstance,
  file: File,
  type: 'image' | string = 'image'
): Promise<DocsUploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await client.post<DocsUploadResponse>('/docs/upload', form, {
    params: { type },
    meta: { skipErrorToast: true },
  });
  return data;
}
