import type { AxiosInstance } from 'axios';
import type { SyncResult } from '@/api/types';

export interface SyncClerkOptions {
  /** Force re-pull from Clerk API into server DB (e.g. after profile edit in Clerk) */
  forceSync?: boolean;
}

/**
 * Syncs Clerk session with backend. POST /auth/sync-clerk.
 */
export async function syncClerk(
  client: AxiosInstance,
  clerkToken: string,
  options?: SyncClerkOptions
): Promise<SyncResult> {
  const { data } = await client.post<SyncResult>(
    '/auth/sync-clerk',
    {
      clerkToken,
      forceSync: options?.forceSync,
    },
    { meta: { skipErrorToast: true } }
  );
  return data;
}
