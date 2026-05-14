/**
 * Zustand store for planning page state.
 * Centralizes date range, filters, and UI state (mirrors leads-store pattern).
 */

import { create } from 'zustand';

import { utcMonthStartThroughToday } from '@/app/reports/utils/overview-daily-summary';

const mtd = utcMonthStartThroughToday();

export interface PlanningFiltersState {
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  selectedStatus: string;
  selectedPriority: string;
  selectedAssigneeId: string;
  selectedClientId: string;
  /** When true, list requests only overdue tasks (server-side). */
  filterOverdueOnly: boolean;
  searchQuery: string;
}

export interface PlanningUIState {
  dateRangePopoverOpen: boolean;
}

interface PlanningStore extends PlanningFiltersState, PlanningUIState {
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
  setUseAllTime: (value: boolean) => void;
  setSelectedStatus: (status: string) => void;
  setSelectedPriority: (priority: string) => void;
  setSelectedAssigneeId: (assigneeId: string) => void;
  setSelectedClientId: (clientId: string) => void;
  setFilterOverdueOnly: (value: boolean) => void;
  setSearchQuery: (query: string) => void;
  setDateRangePopoverOpen: (open: boolean) => void;
  /** Order range so start ≤ end (local comparison). Clears All time. */
  setDateRange: (start: Date, end: Date) => void;
  resetDateRangeToDefault: () => void;
}

export const usePlanningStore = create<PlanningStore>((set) => ({
  startDate: mtd.start,
  endDate: mtd.end,
  useAllTime: false,
  selectedStatus: '',
  selectedPriority: '',
  selectedAssigneeId: '',
  selectedClientId: '',
  filterOverdueOnly: false,
  searchQuery: '',
  dateRangePopoverOpen: false,

  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  setUseAllTime: (value) => set({ useAllTime: value }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
  setSelectedPriority: (priority) => set({ selectedPriority: priority }),
  setSelectedAssigneeId: (assigneeId) => set({ selectedAssigneeId: assigneeId }),
  setSelectedClientId: (clientId) => set({ selectedClientId: clientId }),
  setFilterOverdueOnly: (value) => set({ filterOverdueOnly: value }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDateRangePopoverOpen: (open) => set({ dateRangePopoverOpen: open }),

  setDateRange: (start, end) => {
    const a = start.getTime();
    const b = end.getTime();
    set({
      startDate: a <= b ? start : end,
      endDate: a <= b ? end : start,
      useAllTime: false,
    });
  },

  resetDateRangeToDefault: () =>
    set(() => {
      const r = utcMonthStartThroughToday();
      return {
        startDate: r.start,
        endDate: r.end,
        useAllTime: false,
      };
    }),
}));
