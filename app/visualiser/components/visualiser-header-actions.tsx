'use client';

import { useState } from 'react';
import { BarChart3, Fuel, Info, Loader2, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MapSummaryModal } from '@/app/visualiser/components/map-summary-modal';
import { MapSimulationInfoModal } from '@/app/visualiser/components/map-simulation-info-modal';
import { FuelPricesModal } from '@/app/visualiser/components/fuel-prices-modal';
import { ExportSimulationButton } from '@/app/visualiser/components/export-simulation-button';
import { useVisualiserSimulation } from '@/app/visualiser/simulation-context';
import { useGeocodeMapBatchMutation } from '@/api/hooks';
import type { VisualiserLayerId } from '@/lib/utils/visualiser-map-points';
import type { VisualiserMapPoint } from '@/lib/utils/visualiser-map-points';
import { useTranslation } from 'react-i18next';

type ModalId = 'summary' | 'info' | 'fuel' | null;

interface VisualiserHeaderActionsProps {
  points: VisualiserMapPoint[];
  counts: Record<VisualiserLayerId, number>;
  disabled?: boolean;
  /**
   * Standard-user map: hide summary, petrol prices, and simulation.
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
  const { t } = useTranslation('screens');
  const [openModal, setOpenModal] = useState<ModalId>(null);
  const { openPanel, panelOpen, isActive } = useVisualiserSimulation();
  const geocodeMutation = useGeocodeMapBatchMutation();
  const isGeocoding = geocodeMutation.isPending;
  const simulateLabel = panelOpen
    ? isActive
      ? t('chrome.visualiser.simulation')
      : t('chrome.visualiser.simulate')
    : t('chrome.visualiser.simulate');

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
            aria-label={t('chrome.visualiser.summary')}
            title={t('chrome.visualiser.summary')}
          >
            <BarChart3 className="size-4" />
            <span className="hidden md:inline">{t('chrome.visualiser.summary')}</span>
          </Button>
        )}
        {limited ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setOpenModal('fuel')}
            aria-label={t('chrome.visualiser.petrolPrices')}
            title={t('chrome.visualiser.viewPetrolPrices')}
          >
            <Fuel className="size-4" />
            <span className="hidden md:inline">{t('chrome.visualiser.petrolPrices')}</span>
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
          aria-label={isGeocoding ? t('chrome.visualiser.geocoding') : t('chrome.visualiser.geocode')}
          title={
            limited
              ? t('chrome.visualiser.geocodeUnavailable')
              : t('chrome.visualiser.geocodeHint')
          }
        >
          {isGeocoding ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MapPin className="size-4" />
          )}
          <span className="hidden md:inline">
            {isGeocoding ? t('chrome.visualiser.geocoding') : t('chrome.visualiser.geocode')}
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
              aria-label={t('chrome.visualiser.simulationInfo')}
              title={t('chrome.visualiser.howSimulationWorks')}
            >
              <Info className="size-4" />
            </Button>
            <ExportSimulationButton disabled={disabled} compactOnMobile />
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={() => openPanel('configure')}
              aria-label={simulateLabel}
              title={simulateLabel}
            >
              <Sparkles className="size-4" />
              <span className="hidden md:inline">{simulateLabel}</span>
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
      <FuelPricesModal
        open={openModal === 'fuel'}
        onOpenChange={(open) => setOpenModal(open ? 'fuel' : null)}
      />
    </>
  );
}
