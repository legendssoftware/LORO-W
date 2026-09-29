'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getUsers, type UserListItem } from '@/api/endpoints/user';

const QUERY_KEY = ['users'] as const;

/** Server `MAX_PAGE_LIMIT` on GET /user is 100 — larger limits are silently clamped. */
const USERS_PAGE_LIMIT = 100;
/** Safety cap so a misbehaving `totalPages` can never loop forever (50 × 100 = 5000 users). */
const USERS_MAX_PAGES = 50;

export function usersListQueryKey(options?: {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: number;
}) {
  return [
    ...QUERY_KEY,
    options?.page ?? 1,
    options?.limit ?? 100,
    options?.search ?? '',
    options?.branchId ?? null,
  ] as const;
}

/**
 * Fetches org-scoped user list (GET /user) for dropdowns and multi-select UIs.
 */
export function useUsers(options?: {
  enabled?: boolean;
  page?: number;
  limit?: number;
  search?: string;
  branchId?: number;
}) {
  const client = useApiClient();
  return useQuery({
    queryKey: usersListQueryKey(options),
    queryFn: async () => {
      const res = await getUsers(client, {
        page: options?.page ?? 1,
        limit: options?.limit ?? 100,
        search: options?.search,
        ...(options?.branchId != null ? { branchId: options.branchId } : {}),
      });
      return Array.isArray(res?.data) ? res.data : [];
    },
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Fetches EVERY org-scoped user (GET /user, all pages) for assignment pickers.
 * `useUsers` only returns one page (server caps a page at 100), so anyone past the
 * first 100 names would never be selectable in "Managed staff".
 */
export function useAllUsers(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY, 'all-pages'] as const,
    queryFn: async (): Promise<UserListItem[]> => {
      const all: UserListItem[] = [];
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages && page <= USERS_MAX_PAGES) {
        const res = await getUsers(client, { page, limit: USERS_PAGE_LIMIT });
        const chunk = Array.isArray(res?.data) ? res.data : [];
        all.push(...chunk);
        totalPages = Math.max(1, Number(res?.meta?.totalPages) || 1);
        if (chunk.length === 0) break;
        page += 1;
      }
      return all;
    },
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
