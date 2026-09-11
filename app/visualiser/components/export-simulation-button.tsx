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

interface ExportSimulationButtonProps {
  disabled?: boolean;
  className?: string;
}

/**
 * Downloads a readable A4 PDF briefing of the last visualiser simulation run.
 */
export function ExportSimulationButton({
  disabled = false,
  className,
}: ExportSimulationButtonProps) {
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
      toast.success('Simulation PDF downloaded');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not export simulation PDF';
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
      title={
        isActive
          ? 'Download a PDF briefing of this simulation'
          : 'Run a simulation first to export a PDF'
      }
    >
      {isExporting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {isExporting ? 'Exporting…' : 'Export PDF'}
    </Button>
  );
}
