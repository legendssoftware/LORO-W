'use client';

import { ChevronLeft, ChevronRight, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export const CALLS_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type CallsPageSize = (typeof CALLS_PAGE_SIZE_OPTIONS)[number];

export const CALLS_PAGE_SIZE_STORAGE_KEY = 'loro:calls-page-size';

export function readStoredCallsPageSize(): CallsPageSize {
  if (typeof window === 'undefined') return 25;
  try {
    const raw = localStorage.getItem(CALLS_PAGE_SIZE_STORAGE_KEY);
    const n = raw != null ? Number(raw) : NaN;
    if (CALLS_PAGE_SIZE_OPTIONS.includes(n as CallsPageSize)) return n as CallsPageSize;
  } catch {
    /* ignore */
  }
  return 25;
}

export interface CallsListPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: CallsPageSize;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: CallsPageSize) => void;
  className?: string;
}

function pageNumberWindow(current: number, total: number): number[] {
  if (total <= 1) return total === 1 ? [1] : [];
  const start = Math.max(1, current - 1);
  const end = Math.min(total, current + 1);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

export function CallsListPagination({
  page,
  totalPages,
  total,
  pageSize,
  isFetching = false,
  onPageChange,
  onPageSizeChange,
  className,
}: CallsListPaginationProps) {
  const safeTotalPages = Math.max(totalPages, total > 0 ? 1 : 0);
  const canPrev = page > 1;
  const canNext = page < safeTotalPages;
  const pageNumbers = pageNumberWindow(page, safeTotalPages);

  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card/80 px-2 py-2 sm:px-3',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
        <span className="hidden sm:inline">Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            const n = Number(v);
            if (CALLS_PAGE_SIZE_OPTIONS.includes(n as CallsPageSize)) {
              onPageSizeChange(n as CallsPageSize);
            }
          }}
        >
          <SelectTrigger size="sm" className="h-8 w-[4.5rem]" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CALLS_PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="tabular-nums">
          Page {total > 0 ? page : 0} of {safeTotalPages}
          <span className="hidden sm:inline"> · {total.toLocaleString()} total</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        {isFetching ? (
          <Loader2Icon className="mr-1 size-4 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 sm:px-3"
          disabled={!canPrev || isFetching}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        <div className="hidden items-center gap-0.5 sm:flex">
          {pageNumbers.map((p) => (
            <Button
              key={p}
              type="button"
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-8 min-w-8 px-2 tabular-nums',
                p === page && 'bg-violet-600 text-white hover:bg-violet-700',
              )}
              disabled={isFetching}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 sm:px-3"
          disabled={!canNext || isFetching}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
