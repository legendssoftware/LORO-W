import type { AxiosInstance } from 'axios';

export interface LibraryDocument {
  uid?: number;
  ref?: string;
  title?: string;
  fileType?: string;
  url?: string;
  source?: 'library' | 'bucket';
  owner?: { uid?: number; name?: string };
}

export async function listDocuments(client: AxiosInstance): Promise<LibraryDocument[]> {
  const { data } = await client.get<{ docs?: LibraryDocument[]; data?: LibraryDocument[] } | LibraryDocument[]>('/docs');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.docs)) return data.docs;
  return data.data ?? [];
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
