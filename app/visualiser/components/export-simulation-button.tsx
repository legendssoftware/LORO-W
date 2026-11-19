'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { useOrgName } from '@/lib/org-id-context';
import { useVisualiserSimulation } from '@/app/visualiser/simulation-context';
import { buildSimulationExportDocument } from '@/lib/site-opportunity/build-simulation-export-document';
import { downloadSimulationExportPdf } from '@/lib/site-opportunity/simulation-export-pdf';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ExportSimulationButtonProps {
  disabled?: boolean;
  className?: string;
  /** Hide the "Export PDF" label below `md` (header toolbar). */
  compactOnMobile?: boolean;
}

/**
 * Downloads a readable A4 PDF briefing of the last visualiser simulation run.
 */
export function ExportSimulationButton({
  disabled = false,
  className,
  compactOnMobile = false,
}: ExportSimulationButtonProps) {
  const { t } = useTranslation('screens');
  const orgName = useOrgName();
  const {
    result,
    isActive,
    ranAt,
    runMarkers,
    runFilters,
    runTurnoverOverrides,
    erpMatchedStores,
    erpError,
  } = useVisualiserSimulation();
  const [isExporting, setIsExporting] = useState(false);
  const isDisabled = disabled || !isActive || result == null || isExporting;

  async function handleExport() {
    if (!result || isExporting) return;
    setIsExporting(true);
    try {
      const document = buildSimulationExportDocument({
        result,
        runMarkers,
        runFilters,
        runTurnoverOverrides,
        organisationName: orgName,
        ranAtIso: ranAt,
        erpMatchedStores,
        erpError,
      });
      downloadSimulationExportPdf(document);
      toast.success(t('chrome.visualiser.pdfDownloaded'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('chrome.visualiser.pdfExportFailed');
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(className)}
      disabled={isDisabled}
      onClick={() => void handleExport()}
      aria-label={isExporting ? t('actions.exporting') : t('actions.exportPdf')}
      title={
        isActive
          ? t('chrome.visualiser.pdfDownloadHint')
          : t('chrome.visualiser.pdfRunFirst')
      }
    >
      {isExporting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      <span className={cn(compactOnMobile && 'hidden md:inline')}>
        {isExporting ? t('actions.exporting') : t('actions.exportPdf')}
      </span>
    </Button>
  );
}
