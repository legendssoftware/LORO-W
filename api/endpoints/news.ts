import type { AxiosInstance } from 'axios';

export interface NewsItem {
  uid?: number;
  ref?: string;
  title: string;
  subtitle?: string;
  content?: string;
  coverImage?: string;
  thumbnail?: string;
  publishingDate?: string;
  category?: string;
}

export async function listNews(client: AxiosInstance): Promise<NewsItem[]> {
  const { data } = await client.get<{ data?: NewsItem[] } | NewsItem[]>('/news');
  return Array.isArray(data) ? data : data.data ?? [];
}

export async function saveNews(
  client: AxiosInstance,
  payload: NewsItem & { ref?: string; author?: { uid: number }; branch?: { uid: number } }
): Promise<{ message?: string }> {
  if (payload.ref) {
    const { data } = await client.patch(`/news/${payload.ref}`, payload);
    return data;
  }
  const { data } = await client.post('/news', {
    title: payload.title,
    subtitle: payload.subtitle ?? payload.title,
    content: payload.content ?? '',
    attachments: '',
    coverImage: payload.coverImage ?? '',
    thumbnail: payload.thumbnail ?? payload.coverImage ?? '',
    publishingDate: payload.publishingDate ?? new Date().toISOString(),
    author: payload.author,
    branch: payload.branch,
    isDeleted: false,
    category: payload.category ?? 'news',
  });
  return data;
}

export async function deleteNews(client: AxiosInstance, ref: string): Promise<{ message?: string }> {
  const { data } = await client.delete(`/news/${ref}`);
  return data;
}
