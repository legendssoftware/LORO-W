'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UserListItem } from '@/api/endpoints/user';
import { useUsers } from '@/api/hooks/use-users';

const DEFAULT_DEBOUNCE_MS = 300;
const SERVER_SEARCH_MIN_CHARS = 2;
/** Stable fallback — `data ?? []` would allocate a new array every render and loop setState. */
const EMPTY_USERS: UserListItem[] = [];

export type SearchableUserSnapshot = Pick<
  UserListItem,
  'uid' | 'name' | 'surname' | 'email' | 'photoURL' | 'avatar'
> & {
  branch?: { uid: number; name?: string } | null;
  branchUid?: number | null;
  username?: string | null;
};

function toSnapshot(u: UserListItem | SearchableUserSnapshot): SearchableUserSnapshot {
  return {
    uid: u.uid,
    name: u.name,
    surname: u.surname,
    email: u.email,
    photoURL: u.photoURL,
    avatar: u.avatar,
    branch: u.branch ?? null,
    branchUid:
      'branchUid' in u && u.branchUid != null
        ? Number(u.branchUid)
        : u.branch?.uid != null
          ? Number(u.branch.uid)
          : null,
    username:
      'username' in u && typeof u.username === 'string' ? u.username : null,
  };
}

export interface UseSearchableUsersListOptions {
  enabled?: boolean;
  page?: number;
  limit?: number;
  branchId?: number;
  debounceMs?: number;
}

/**
 * Org user list for combobox pickers: first page locally, server search after 2+ chars.
 * Keeps a snapshot of the selected user so the trigger label survives search clear.
 */
export function useSearchableUsersList(
  options?: UseSearchableUsersListOptions
) {
  const limit = options?.limit ?? 100;
  const page = options?.page ?? 1;
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const enabled = options?.enabled !== false;

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] =
    useState<SearchableUserSnapshot | null>(null);
  const [baseUsers, setBaseUsers] = useState<UserListItem[]>([]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, debounceMs);
    return () => window.clearTimeout(id);
  }, [searchQuery, debounceMs]);

  const serverSearch =
    debouncedSearch.length >= SERVER_SEARCH_MIN_CHARS
      ? debouncedSearch
      : undefined;

  const {
    data,
    isFetching,
    isLoading,
    isError,
    error,
    refetch,
  } = useUsers({
    enabled,
    page,
    limit,
    search: serverSearch,
    branchId: options?.branchId,
  });

  const usersPage = data ?? EMPTY_USERS;

  // Capture the unfiltered first page without depending on a fresh `[]` each render.
  useEffect(() => {
    if (serverSearch || !data) return;
    setBaseUsers((prev) => (prev === data ? prev : data));
  }, [serverSearch, data]);

  const users = useMemo(() => {
    if (!selectedSnapshot) return usersPage;
    if (usersPage.some((u) => u.uid === selectedSnapshot.uid)) {
      return usersPage;
    }
    return [selectedSnapshot as UserListItem, ...usersPage];
  }, [usersPage, selectedSnapshot]);

  const rememberUser = useCallback((u: UserListItem | SearchableUserSnapshot) => {
    setSelectedSnapshot(toSnapshot(u));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSnapshot(null);
  }, []);

  /**
   * Wrap picker `onUidChange`: snapshot the chosen user (or clear) and forward the value.
   */
  const bindUidChange = useCallback(
    (onUidChange: (uid: string) => void) => (uid: string) => {
      if (uid === 'all' || uid === '' || uid === 'none') {
        setSelectedSnapshot(null);
        setSearchQuery('');
        onUidChange(uid);
        return;
      }
      const num = Number(uid);
      const fromList =
        usersPage.find((u) => u.uid === num) ??
        (selectedSnapshot?.uid === num ? selectedSnapshot : null);
      if (fromList) setSelectedSnapshot(toSnapshot(fromList));
      onUidChange(uid);
    },
    [usersPage, selectedSnapshot]
  );

  return {
    /** List for the picker (search results + selected snapshot). */
    users,
    /**
     * Last unfiltered first-page list — use for map enrichment / actor lookups
     * so typing in the picker does not shrink those datasets.
     */
    baseUsers: baseUsers.length > 0 ? baseUsers : usersPage,
    searchQuery,
    setSearchQuery,
    isSearchLoading: !!serverSearch && isFetching,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    rememberUser,
    clearSelection,
    bindUidChange,
    selectedSnapshot,
  };
}
