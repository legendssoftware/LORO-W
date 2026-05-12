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
  selectedClientId: string;
  /** When true, list requests only overdue tasks (server-side for org list; client-side for “My tasks”). */
  filterOverdueOnly: boolean;
  /** Use GET /tasks/for/:me instead of paginated /tasks. */
  myTasksOnly: boolean;
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
  setMyTasksOnly: (value: boolean) => void;
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
  selectedClientId: '',
  filterOverdueOnly: false,
  myTasksOnly: false,
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
  setMyTasksOnly: (value) => set({ myTasksOnly: value }),
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
