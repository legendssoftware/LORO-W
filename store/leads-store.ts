/**
 * Zustand store for leads page state.
 * Centralizes date range, filters, and UI state (mirrors visits-store pattern).
 */

import { create } from 'zustand';

import type { LeadsReportDateBasis } from '@/api/types/leads';
import { utcMonthStartThroughToday } from '@/app/reports/utils/overview-daily-summary';

const mtd = utcMonthStartThroughToday();

export interface LeadsFiltersState {
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  /** When a date range is set: filter by creation vs last activity (updatedAt). */
  dateBasis: LeadsReportDateBasis;
  selectedStatus: string;
  selectedSource: string;
  selectedEntryType: string;
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
  setDateBasis: (basis: LeadsReportDateBasis) => void;
  setSelectedStatus: (status: string) => void;
  setSelectedSource: (source: string) => void;
  setSelectedEntryType: (entryType: string) => void;
  setSelectedPriority: (priority: string) => void;
  setSelectedUserId: (userId: string) => void;
  setSearchQuery: (query: string) => void;
  setDateRangePopoverOpen: (open: boolean) => void;
  selectEndDateAndClose: (date: Date) => void;
  resetDateRangeToDefault: () => void;
}

export const useLeadsStore = create<LeadsStore>((set) => ({
  startDate: mtd.start,
  endDate: mtd.end,
  useAllTime: false,
  dateBasis: 'created',
  selectedStatus: 'all',
  selectedSource: 'all',
  selectedEntryType: 'all',
  selectedPriority: '',
  selectedUserId: '',
  searchQuery: '',
  dateRangePopoverOpen: false,

  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  setUseAllTime: (value) => set({ useAllTime: value }),
  setDateBasis: (basis) => set({ dateBasis: basis }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
  setSelectedSource: (source) => set({ selectedSource: source }),
  setSelectedEntryType: (entryType) => set({ selectedEntryType: entryType }),
  setSelectedPriority: (priority) => set({ selectedPriority: priority }),
  setSelectedUserId: (userId) => set({ selectedUserId: userId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDateRangePopoverOpen: (open) => set({ dateRangePopoverOpen: open }),

  selectEndDateAndClose: (date) =>
    set({ endDate: date, useAllTime: false, dateRangePopoverOpen: false }),

  resetDateRangeToDefault: () =>
    set(() => {
      const r = utcMonthStartThroughToday();
      return {
        startDate: r.start,
        endDate: r.end,
        useAllTime: false,
        dateBasis: 'created',
      };
    }),
}));
