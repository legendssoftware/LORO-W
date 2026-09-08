import type { AxiosInstance } from 'axios';
import { uploadDocFile } from './docs';

/**
 * Uploads a file via POST /docs/upload and returns its public URL.
 * @throws Error if upload fails or the response has no URL
 */
export async function uploadFile(client: AxiosInstance, file: File): Promise<string> {
  const data = await uploadDocFile(client, file);
  const url = data.publicUrl ?? data.url;
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Upload succeeded but no URL was returned');
  }
  return url;
}
