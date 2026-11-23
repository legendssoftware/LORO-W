'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  readStoredPageSize,
  type VisitsPageSize,
} from '@/app/visits/components/visits-list-pagination';

export interface UseStandardListPaginationOptions<T> {
  items: T[];
  storageKey: string;
  /** Reset to page 1 when this key changes (e.g. filter/search). */
  resetKey?: string | number;
}

export interface UseStandardListPaginationResult<T> {
  page: number;
  pageSize: VisitsPageSize;
  total: number;
  totalPages: number;
  pageItems: T[];
  setPage: (page: number) => void;
  handlePageSizeChange: (size: VisitsPageSize) => void;
}

/**
 * Client-side slice pagination matching Visits page-size options and storage.
 */
export function useStandardListPagination<T>({
  items,
  storageKey,
  resetKey,
}: UseStandardListPaginationOptions<T>): UseStandardListPaginationResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<VisitsPageSize>(() => readStoredPageSize(storageKey));

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const handlePageSizeChange = useCallback(
    (size: VisitsPageSize) => {
      setPageSize(size);
      try {
        localStorage.setItem(storageKey, String(size));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  return {
    page,
    pageSize,
    total,
    totalPages,
    pageItems,
    setPage,
    handlePageSizeChange,
  };
}
