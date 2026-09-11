'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { MapMarkerBase } from '@/api/types/map';
import type {
  SiteOpportunityResult,
  SiteOpportunityZone,
  TurnoverOverrideSettings,
} from '@/api/types/site-opportunity';

export type SimulationPanelMode = 'configure' | 'results';

export interface SimulationRunFilters {
  country: string;
  province: string;
  mode: 'both' | 'catchment' | 'greenfield';
}

export interface VisualiserSimulationState {
  result: SiteOpportunityResult | null;
  selectedZoneId: string | null;
  isActive: boolean;
  ranAt: string | null;
  erpMatchedStores: number;
  erpError: string | null;
  panelOpen: boolean;
  panelMode: SimulationPanelMode;
  /** Markers used for the last run (for competitor name/address lists). */
  runMarkers: MapMarkerBase[];
  /** Geo + mode scope applied on the last successful run. */
  runFilters: SimulationRunFilters | null;
  /** Brand turnover overrides applied on the last successful run. */
  runTurnoverOverrides: TurnoverOverrideSettings | null;
}

interface VisualiserSimulationContextValue extends VisualiserSimulationState {
  setSimulationResult: (
    result: SiteOpportunityResult | null,
    meta?: {
      erpMatchedStores?: number;
      erpError?: string | null;
      markers?: MapMarkerBase[];
      filters?: SimulationRunFilters | null;
      turnoverOverrides?: TurnoverOverrideSettings | null;
    },
  ) => void;
  selectZone: (zoneId: string | null) => void;
  clearSimulation: () => void;
  openPanel: (mode?: SimulationPanelMode) => void;
  closePanel: () => void;
  setPanelMode: (mode: SimulationPanelMode) => void;
  selectedZone: SiteOpportunityZone | null;
  allZones: SiteOpportunityZone[];
}

const VisualiserSimulationContext =
  createContext<VisualiserSimulationContextValue | null>(null);

const EMPTY: VisualiserSimulationState = {
  result: null,
  selectedZoneId: null,
  isActive: false,
  ranAt: null,
  erpMatchedStores: 0,
  erpError: null,
  panelOpen: false,
  panelMode: 'configure',
  runMarkers: [],
  runFilters: null,
  runTurnoverOverrides: null,
};

export function VisualiserSimulationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VisualiserSimulationState>(EMPTY);

  const setSimulationResult = useCallback(
    (
      result: SiteOpportunityResult | null,
      meta?: {
        erpMatchedStores?: number;
        erpError?: string | null;
        markers?: MapMarkerBase[];
        filters?: SimulationRunFilters | null;
        turnoverOverrides?: TurnoverOverrideSettings | null;
      },
    ) => {
      setState((prev) => ({
        ...prev,
        result,
        selectedZoneId:
          result?.catchments[0]?.id ?? result?.greenfield[0]?.id ?? null,
        isActive: result != null,
        ranAt: result ? new Date().toISOString() : null,
        erpMatchedStores: meta?.erpMatchedStores ?? 0,
        erpError: meta?.erpError ?? null,
        panelOpen: true,
        panelMode: result != null ? 'results' : prev.panelMode,
        runMarkers: meta?.markers ?? prev.runMarkers,
        runFilters:
          result == null ? null : (meta?.filters ?? prev.runFilters),
        runTurnoverOverrides:
          result == null
            ? null
            : (meta?.turnoverOverrides ?? prev.runTurnoverOverrides),
      }));
    },
    [],
  );

  const selectZone = useCallback((zoneId: string | null) => {
    setState((prev) => ({ ...prev, selectedZoneId: zoneId, panelMode: 'results' }));
  }, []);

  const clearSimulation = useCallback(() => {
    setState((prev) => ({
      ...EMPTY,
      panelOpen: prev.panelOpen,
      panelMode: 'configure',
    }));
  }, []);

  const openPanel = useCallback((mode: SimulationPanelMode = 'configure') => {
    setState((prev) => ({
      ...prev,
      panelOpen: true,
      panelMode: prev.isActive && mode === 'configure' ? 'configure' : mode,
    }));
  }, []);

  const closePanel = useCallback(() => {
    setState((prev) => ({ ...prev, panelOpen: false }));
  }, []);

  const setPanelMode = useCallback((mode: SimulationPanelMode) => {
    setState((prev) => ({ ...prev, panelMode: mode }));
  }, []);

  const allZones = useMemo<SiteOpportunityZone[]>(() => {
    if (!state.result) return [];
    return [...state.result.catchments, ...state.result.greenfield];
  }, [state.result]);

  const selectedZone = useMemo(() => {
    if (!state.selectedZoneId) return null;
    return allZones.find((z) => z.id === state.selectedZoneId) ?? null;
  }, [allZones, state.selectedZoneId]);

  const value = useMemo<VisualiserSimulationContextValue>(
    () => ({
      ...state,
      setSimulationResult,
      selectZone,
      clearSimulation,
      openPanel,
      closePanel,
      setPanelMode,
      selectedZone,
      allZones,
    }),
    [
      state,
      setSimulationResult,
      selectZone,
      clearSimulation,
      openPanel,
      closePanel,
      setPanelMode,
      selectedZone,
      allZones,
    ],
  );

  return (
    <VisualiserSimulationContext.Provider value={value}>
      {children}
    </VisualiserSimulationContext.Provider>
  );
}

export function useVisualiserSimulation(): VisualiserSimulationContextValue {
  const ctx = useContext(VisualiserSimulationContext);
  if (!ctx) {
    throw new Error(
      'useVisualiserSimulation must be used within VisualiserSimulationProvider',
    );
  }
  return ctx;
}
