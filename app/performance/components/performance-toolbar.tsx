'use client';

import { Filter, RefreshCw } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { PerformanceFilters } from '@/api/types/reports-performance';
import { getCountriesDisplayLabel } from '../lib/performance-countries';
import {
  formatDateRangeLabel,
  formatLocalYmd,
  getLocalTodayIsoDate,
  parseLocalYmd,
} from '../lib/dates';
import { useIsMdUp } from '../lib/use-media-md';

interface PerformanceToolbarProps {
  filters: PerformanceFilters;
  hasActiveFilters: boolean;
  showConsolidatedView: boolean;
  isRefetching: boolean;
  onToggleFilters: () => void;
  onToggleConsolidatedView: () => void;
  onRefresh: () => void;
  onClearFilters: () => void;
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

export function PerformanceToolbar({
  filters,
  hasActiveFilters,
  showConsolidatedView,
  isRefetching,
  onToggleFilters,
  onToggleConsolidatedView,
  onRefresh,
  onClearFilters,
  onDateRangeChange,
}: PerformanceToolbarProps) {
  const start = parseLocalYmd(filters.dateRange?.startDate ?? getLocalTodayIsoDate());
  const end = parseLocalYmd(filters.dateRange?.endDate ?? getLocalTodayIsoDate());
  const range: DateRange = { from: start, to: end };
  const dateLabel = filters.dateRange
    ? formatDateRangeLabel(filters.dateRange.startDate, filters.dateRange.endDate)
    : 'Select dates';
  const isMdUp = useIsMdUp();

  return (
    <div className="mb-4 space-y-3 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <p className="truncate text-xs text-muted-foreground sm:text-sm">
        {getCountriesDisplayLabel(filters.countries)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="h-9 max-w-full truncate">
              {dateLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={range}
              numberOfMonths={isMdUp ? 2 : 1}
              onSelect={(next) => {
                if (!next?.from) return;
                onDateRangeChange(
                  formatLocalYmd(next.from),
                  formatLocalYmd(next.to ?? next.from)
                );
              }}
            />
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-9 px-0 md:w-auto md:px-3"
          onClick={onToggleFilters}
          aria-label="Filter"
        >
          <Filter className="size-4 md:mr-1.5" />
          <span className="hidden md:inline">Filter</span>
        </Button>
        <Button
          type="button"
          variant={showConsolidatedView ? 'default' : 'outline'}
          className="h-9"
          onClick={onToggleConsolidatedView}
        >
          {showConsolidatedView ? 'Performance Report' : 'Consolidated Report'}
        </Button>
        <Button
          type="button"
          variant="success"
          className="h-9 w-full sm:w-auto"
          onClick={onRefresh}
          disabled={isRefetching}
        >
          <RefreshCw className={cn('mr-1.5 size-4', isRefetching && 'animate-spin')} />
          {isRefetching ? 'Refreshing…' : 'Refresh'}
        </Button>
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" className="h-9" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
