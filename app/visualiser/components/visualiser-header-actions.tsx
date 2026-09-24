'use client';

import { useState } from 'react';
import { BarChart3, Info, Loader2, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MapSummaryModal } from '@/app/visualiser/components/map-summary-modal';
import { MapSimulationInfoModal } from '@/app/visualiser/components/map-simulation-info-modal';
import { ExportSimulationButton } from '@/app/visualiser/components/export-simulation-button';
import { useVisualiserSimulation } from '@/app/visualiser/simulation-context';
import { useGeocodeMapBatchMutation } from '@/api/hooks';
import type { VisualiserLayerId } from '@/lib/utils/visualiser-map-points';
import type { VisualiserMapPoint } from '@/lib/utils/visualiser-map-points';

type ModalId = 'summary' | 'info' | null;

interface VisualiserHeaderActionsProps {
  points: VisualiserMapPoint[];
  counts: Record<VisualiserLayerId, number>;
  disabled?: boolean;
  /**
   * Standard-user map: hide summary and simulation.
   * Geocode stays visible and is forced off.
   */
  limited?: boolean;
}

export function VisualiserHeaderActions({
  points,
  counts,
  disabled = false,
  limited = false,
}: VisualiserHeaderActionsProps) {
  const [openModal, setOpenModal] = useState<ModalId>(null);
  const { openPanel, panelOpen, isActive } = useVisualiserSimulation();
  const geocodeMutation = useGeocodeMapBatchMutation();
  const isGeocoding = geocodeMutation.isPending;

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2" data-tour="visualiser-header-actions">
        {limited ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setOpenModal('summary')}
            aria-label="Map data summary"
            title="Map data summary"
          >
            <BarChart3 className="size-4" />
            <span className="hidden md:inline">Map data summary</span>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || limited || isGeocoding}
          onClick={() =>
            geocodeMutation.mutate({ resetExhausted: true, maxGeocodes: 500 })
          }
          aria-label={isGeocoding ? 'Geocoding…' : 'Geocode'}
          title={
            limited
              ? 'Geocode is unavailable for your role'
              : 'Clear exhausted coordinates and re-geocode missing map addresses'
          }
        >
          {isGeocoding ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MapPin className="size-4" />
          )}
          <span className="hidden md:inline">
            {isGeocoding ? 'Geocoding…' : 'Geocode'}
          </span>
        </Button>
        {limited ? null : (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={disabled}
              onClick={() => setOpenModal('info')}
              aria-label="Simulation info"
              title="How simulation works"
            >
              <Info className="size-4" />
            </Button>
            <ExportSimulationButton disabled={disabled} compactOnMobile />
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={() => openPanel(isActive ? 'results' : 'configure')}
              aria-label={panelOpen ? (isActive ? 'Simulation' : 'Simulate') : 'Simulate'}
              title={panelOpen ? (isActive ? 'Simulation' : 'Simulate') : 'Simulate'}
            >
              <Sparkles className="size-4" />
              <span className="hidden md:inline">
                {panelOpen ? (isActive ? 'Simulation' : 'Simulate') : 'Simulate'}
              </span>
            </Button>
          </>
        )}
      </div>

      <MapSummaryModal
        open={openModal === 'summary'}
        onOpenChange={(open) => setOpenModal(open ? 'summary' : null)}
        points={points}
        counts={counts}
      />
      <MapSimulationInfoModal
        open={openModal === 'info'}
        onOpenChange={(open) => setOpenModal(open ? 'info' : null)}
      />
    </>
  );
}
