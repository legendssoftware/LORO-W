/**
 * Zustand store for planning page state.
 * Centralizes date range, filters, and UI state (mirrors leads-store pattern).
 */

import { create } from 'zustand';

const today = new Date();
const defaultEnd = today;
const defaultStart = today;

export interface PlanningFiltersState {
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  selectedStatus: string;
  selectedPriority: string;
  selectedAssigneeId: string;
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
  setSearchQuery: (query: string) => void;
  setDateRangePopoverOpen: (open: boolean) => void;
  selectEndDateAndClose: (date: Date) => void;
  resetDateRangeToDefault: () => void;
}

export const usePlanningStore = create<PlanningStore>((set) => ({
  startDate: defaultStart,
  endDate: defaultEnd,
  useAllTime: false,
  selectedStatus: '',
  selectedPriority: '',
  selectedAssigneeId: '',
  searchQuery: '',
  dateRangePopoverOpen: false,

  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  setUseAllTime: (value) => set({ useAllTime: value }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
  setSelectedPriority: (priority) => set({ selectedPriority: priority }),
  setSelectedAssigneeId: (assigneeId) => set({ selectedAssigneeId: assigneeId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDateRangePopoverOpen: (open) => set({ dateRangePopoverOpen: open }),

  selectEndDateAndClose: (date) =>
    set({ endDate: date, useAllTime: false, dateRangePopoverOpen: false }),

  resetDateRangeToDefault: () =>
    set({
      startDate: defaultStart,
      endDate: defaultEnd,
      useAllTime: false,
    }),
}));
