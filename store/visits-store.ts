/**
 * Zustand store for visits page state.
 * Centralizes date range, filters, and UI state (mirrors leads-store pattern).
 */
import { create } from 'zustand';
import type { MethodOfContact } from '@/api/types/visits';
import type { ClientListItem } from '@/api/endpoints/clients';
import { utcMonthStartThroughToday } from '@/lib/utils/overview-daily-summary';

function defaultUtcMtdDates(): { start: Date; end: Date } {
  return utcMonthStartThroughToday();
}

const mtd = defaultUtcMtdDates();
const defaultStart = mtd.start;
const defaultEnd = mtd.end;

export interface VisitsFiltersState {
  startDate: Date;
  endDate: Date;
  useAllTime: boolean;
  selectedRegion: string;
  selectedBusinessType: string;
  selectedUserUid: string;
  searchQuery: string;
}

export interface VisitsUIState {
  dateRangePopoverOpen: boolean;
  methodModalOpen: boolean;
  endVisitOpen: boolean;
  followUpPickerOpen: boolean;
  selectedMethod: MethodOfContact | null;
  selectedClient: ClientListItem | null;
  clientSearch: string;
}

interface VisitsStore extends VisitsFiltersState, VisitsUIState {
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
  setUseAllTime: (value: boolean) => void;
  setSelectedRegion: (region: string) => void;
  setSelectedBusinessType: (businessType: string) => void;
  setSelectedUserUid: (userUid: string) => void;
  setSearchQuery: (query: string) => void;
  setDateRangePopoverOpen: (open: boolean) => void;
  setMethodModalOpen: (open: boolean) => void;
  setEndVisitOpen: (open: boolean) => void;
  setFollowUpPickerOpen: (open: boolean) => void;
  setSelectedMethod: (method: MethodOfContact | null) => void;
  setSelectedClient: (client: ClientListItem | null) => void;
  setClientSearch: (query: string) => void;
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
  selectedMethod: null,
  selectedClient: null,
  clientSearch: '',

  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  setUseAllTime: (value) => set({ useAllTime: value }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setSelectedBusinessType: (businessType) => set({ selectedBusinessType: businessType }),
  setSelectedUserUid: (userUid) => set({ selectedUserUid: userUid }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDateRangePopoverOpen: (open) => set({ dateRangePopoverOpen: open }),
  setMethodModalOpen: (open) => set({ methodModalOpen: open }),
  setEndVisitOpen: (open) => set({ endVisitOpen: open }),
  setFollowUpPickerOpen: (open) => set({ followUpPickerOpen: open }),
  setSelectedMethod: (method) => set({ selectedMethod: method }),
  setSelectedClient: (client) => set({ selectedClient: client }),
  setClientSearch: (query) => set({ clientSearch: query }),

  selectEndDateAndClose: (date) =>
    set({ endDate: date, useAllTime: false, dateRangePopoverOpen: false }),

  resetDateRangeToDefault: () =>
    set(() => {
      const r = defaultUtcMtdDates();
      return {
        startDate: r.start,
        endDate: r.end,
        useAllTime: false,
      };
    }),
}));
