'use client';

import { useState } from 'react';
import { BarChart3, Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MapSummaryModal } from '@/app/visualiser/components/map-summary-modal';
import { MapSimulationInfoModal } from '@/app/visualiser/components/map-simulation-info-modal';
import { useVisualiserSimulation } from '@/app/visualiser/simulation-context';
import type { VisualiserLayerId } from '@/lib/utils/visualiser-map-points';
import type { VisualiserMapPoint } from '@/lib/utils/visualiser-map-points';

type ModalId = 'summary' | 'info' | null;

interface VisualiserHeaderActionsProps {
  points: VisualiserMapPoint[];
  counts: Record<VisualiserLayerId, number>;
  disabled?: boolean;
}

export function VisualiserHeaderActions({
  points,
  counts,
  disabled = false,
}: VisualiserHeaderActionsProps) {
  const [openModal, setOpenModal] = useState<ModalId>(null);
  const { openPanel, panelOpen, isActive } = useVisualiserSimulation();

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setOpenModal('summary')}
        >
          <BarChart3 className="size-4" />
          Map data summary
        </Button>
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
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() => openPanel(isActive ? 'results' : 'configure')}
        >
          <Sparkles className="size-4" />
          {panelOpen ? (isActive ? 'Simulation' : 'Simulate') : 'Simulate'}
        </Button>
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
