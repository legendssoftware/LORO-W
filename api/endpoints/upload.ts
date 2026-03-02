import type { AxiosInstance } from 'axios';

const UPLOAD_NOT_CONFIGURED =
  'Upload not configured. Add a POST /upload endpoint that returns { url: string }, or set NEXT_PUBLIC_UPLOAD_URL.';

/**
 * Uploads a file and returns its URL. Uses the API client to POST to /upload
 * (or NEXT_PUBLIC_UPLOAD_URL if set). Expects response shape { url: string } or { fileUrl: string }.
 * @throws Error if upload fails or response has no URL
 */
export async function uploadFile(
  client: AxiosInstance,
  file: File
): Promise<string> {
  const uploadUrl =
    typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_UPLOAD_URL;
  const formData = new FormData();
  formData.append('file', file);

  try {
    if (uploadUrl && uploadUrl.startsWith('http')) {
      const token =
        typeof client.defaults?.headers?.common?.Authorization === 'string'
          ? client.defaults.headers.common.Authorization
          : '';
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: token ? { Authorization: token } : {},
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = (await res.json()) as { url?: string; fileUrl?: string };
      const url = data?.url ?? data?.fileUrl;
      if (typeof url !== 'string') throw new Error('Invalid upload response');
      return url;
    }
    const { data } = await client.post<{ url?: string; fileUrl?: string }>(
      '/upload',
      formData
    );
    const url = data?.url ?? data?.fileUrl;
    if (typeof url !== 'string') throw new Error('Invalid upload response');
    return url;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('404') || err.message.includes('Upload failed'))
        throw new Error(UPLOAD_NOT_CONFIGURED);
      throw err;
    }
    throw new Error(UPLOAD_NOT_CONFIGURED);
  }
}
