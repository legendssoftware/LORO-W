import type { AxiosInstance } from 'axios';
import type { SyncResult } from '@/api/types';

/**
 * Syncs Clerk session with backend. POST /auth/sync-clerk.
 */
export async function syncClerk(client: AxiosInstance, clerkToken: string): Promise<SyncResult> {
  const { data } = await client.post<SyncResult>('/auth/sync-clerk', { clerkToken });
  return data;
}
