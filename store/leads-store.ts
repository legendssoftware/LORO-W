/**
 * Zustand store for leads page state.
 * Centralizes date range, filters, and UI state (mirrors visits-store pattern).
 */

import { create } from 'zustand';

const today = new Date();
const defaultEnd = today;
const defaultStart = today;

export interface LeadsFiltersState {
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  selectedStatus: string;
  selectedSource: string;
  selectedPriority: string;
  selectedUserId: string;
  searchQuery: string;
}

export interface LeadsUIState {
  dateRangePopoverOpen: boolean;
}

interface LeadsStore extends LeadsFiltersState, LeadsUIState {
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
  setUseAllTime: (value: boolean) => void;
  setSelectedStatus: (status: string) => void;
  setSelectedSource: (source: string) => void;
  setSelectedPriority: (priority: string) => void;
  setSelectedUserId: (userId: string) => void;
  setSearchQuery: (query: string) => void;
  setDateRangePopoverOpen: (open: boolean) => void;
  selectEndDateAndClose: (date: Date) => void;
  resetDateRangeToDefault: () => void;
}

export const useLeadsStore = create<LeadsStore>((set) => ({
  startDate: defaultStart,
  endDate: defaultEnd,
  useAllTime: false,
  selectedStatus: '',
  selectedSource: '',
  selectedPriority: '',
  selectedUserId: '',
  searchQuery: '',
  dateRangePopoverOpen: false,

  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  setUseAllTime: (value) => set({ useAllTime: value }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
  setSelectedSource: (source) => set({ selectedSource: source }),
  setSelectedPriority: (priority) => set({ selectedPriority: priority }),
  setSelectedUserId: (userId) => set({ selectedUserId: userId }),
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
