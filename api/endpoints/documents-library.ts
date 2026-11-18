import type { AxiosInstance } from 'axios';

export interface LibraryDocument {
  uid?: number;
  ref?: string;
  title?: string;
  fileType?: string;
  url?: string;
  owner?: { uid?: number; name?: string };
}

export async function listDocuments(client: AxiosInstance): Promise<LibraryDocument[]> {
  const { data } = await client.get<{ data?: LibraryDocument[] } | LibraryDocument[]>('/docs');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function createDocumentRecord(
  client: AxiosInstance,
  payload: { title: string; fileType: string; url: string; owner?: { uid: number }; branch?: { uid: number } }
): Promise<{ message?: string }> {
  const { data } = await client.post('/docs', payload);
  return data;
}

export function documentDownloadPath(ref: string | number): string {
  return `/docs/download/${ref}`;
}
