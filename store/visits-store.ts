/**
 * Zustand store for visits page state.
 * Centralizes date range, filters, and UI state for clean, predictable updates.
 */

import { create } from 'zustand';
import { subDays } from 'date-fns';
import type { MethodOfContact } from '@/api/types/visits';
import type { ClientListItem } from '@/api/endpoints/clients';

const today = new Date();
const defaultEnd = today;
const defaultStart = subDays(today, 30);

export interface VisitsFiltersState {
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  selectedRegion: string;
  selectedBusinessType: string;
  selectedUserUid: string;
  searchQuery: string;
}

export type VisitsViewMode = 'table' | 'map';

export interface VisitsUIState {
  dateRangePopoverOpen: boolean;
  methodModalOpen: boolean;
  endVisitOpen: boolean;
  followUpPickerOpen: boolean;
  viewMode: VisitsViewMode;
}

export interface VisitsFormState {
  selectedMethod: MethodOfContact | null;
  selectedClient: ClientListItem | null;
  clientSearch: string;
}

interface VisitsStore extends VisitsFiltersState, VisitsUIState, VisitsFormState {
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
  setUseAllTime: (value: boolean) => void;
  setSelectedRegion: (region: string) => void;
  setSelectedBusinessType: (type: string) => void;
  setSearchQuery: (query: string) => void;
  setDateRangePopoverOpen: (open: boolean) => void;
  setMethodModalOpen: (open: boolean) => void;
  setEndVisitOpen: (open: boolean) => void;
  setFollowUpPickerOpen: (open: boolean) => void;
  setViewMode: (mode: VisitsViewMode) => void;
  setSelectedMethod: (method: MethodOfContact | null) => void;
  setSelectedClient: (client: ClientListItem | null) => void;
  setClientSearch: (search: string) => void;
  selectEndDateAndClose: (date: Date) => void;
  resetDateRangeToDefault: () => void;
}

export const useVisitsStore = create<VisitsStore>((set) => ({
  startDate: defaultStart,
  endDate: defaultEnd,
  useAllTime: false,
  selectedRegion: '',
  selectedBusinessType: '',
  selectedUserUid: '',
  searchQuery: '',
  dateRangePopoverOpen: false,
  methodModalOpen: false,
  endVisitOpen: false,
  followUpPickerOpen: false,
  viewMode: 'table' as VisitsViewMode,
  selectedMethod: null,
  selectedClient: null,
  clientSearch: '',

  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  setUseAllTime: (value) => set({ useAllTime: value }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setSelectedBusinessType: (type) => set({ selectedBusinessType: type }),
  setSelectedUserUid: (uid) => set({ selectedUserUid: uid }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDateRangePopoverOpen: (open) => set({ dateRangePopoverOpen: open }),
  setMethodModalOpen: (open) => set({ methodModalOpen: open }),
  setEndVisitOpen: (open) => set({ endVisitOpen: open }),
  setFollowUpPickerOpen: (open) => set({ followUpPickerOpen: open }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedMethod: (method) => set({ selectedMethod: method }),
  setSelectedClient: (client) => set({ selectedClient: client }),
  setClientSearch: (search) => set({ clientSearch: search }),

  selectEndDateAndClose: (date) =>
    set({ endDate: date, useAllTime: false, dateRangePopoverOpen: false }),

  resetDateRangeToDefault: () =>
    set({
      startDate: defaultStart,
      endDate: defaultEnd,
      useAllTime: false,
    }),
}));
