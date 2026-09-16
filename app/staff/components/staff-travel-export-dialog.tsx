'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApiClient } from '@/api/hooks';
import { fetchTravelAnalysis } from '@/api/endpoints/reports-travel-analysis';
import { downloadTravelExport } from '@/api/endpoints/reports-travel-export';
import { UtcDateRangePicker } from '@/components/filters/utc-date-range-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogCloseButton } from '@/components/dialog-close-button';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { formatUtcYmd, utcToday } from '@/lib/utils/overview-daily-summary';
import { buildTravelAnalysisDocument } from '@/lib/travel-analysis/build-travel-analysis-document';
import { downloadTravelAnalysisPdf } from '@/lib/travel-analysis/travel-analysis-pdf';

/**
 * Date-range dialog that downloads the reports travel Excel workbook or Analysis PDF for one staff member.
 */
export function StaffTravelExportDialog({
  open,
  onOpenChange,
  userUid,
  userName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userUid: number;
  userName: string;
}) {
  const client = useApiClient();
  const [startDate, setStartDate] = useState(utcToday);
  const [endDate, setEndDate] = useState(utcToday);
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);

  const isBusy = isExporting || isAnalysing;

  useEffect(() => {
    if (!open) return;
    const today = utcToday();
    setStartDate(today);
    setEndDate(today);
    setIsExporting(false);
    setIsAnalysing(false);
  }, [open]);

  /**
   * Downloads the 5-sheet travel workbook scoped to this user and the selected UTC range.
   */
  async function handleExport() {
    if (isBusy) return;
    setIsExporting(true);
    try {
      await downloadTravelExport(client, {
        from: formatUtcYmd(startDate),
        to: formatUtcYmd(endDate),
        userUid,
        skipErrorToast: true,
      });
      toast.success('Travel report downloaded');
      onOpenChange(false);
    } catch (error) {
      toast.error(getQueryErrorMessage(error, 'Could not export travels'));
    } finally {
      setIsExporting(false);
    }
  }

  /**
   * Downloads a visualiser-style A4 PDF briefing of day-by-day trips, areas, patterns, and fuel.
   */
  async function handleAnalysis() {
    if (isBusy) return;
    setIsAnalysing(true);
    try {
      const payload = await fetchTravelAnalysis(client, {
        from: formatUtcYmd(startDate),
        to: formatUtcYmd(endDate),
        userUid,
        skipErrorToast: true,
      });
      const document = buildTravelAnalysisDocument(payload, userName);
      downloadTravelAnalysisPdf(document);
      toast.success('Travel analysis downloaded');
      onOpenChange(false);
    } catch (error) {
      toast.error(getQueryErrorMessage(error, 'Could not export travel analysis'));
    } finally {
      setIsAnalysing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col w-full max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[85vh] p-4 sm:p-6 pt-12 pr-14"
      >
        <div className="absolute top-4 right-4 z-10">
          <DialogCloseButton />
        </div>
        <DialogHeader>
          <DialogTitle>Export travels — {userName}</DialogTitle>
          <DialogDescription>
            Choose a date range. Excel is the visits and travel workbook. Analysis is a day-by-day PDF briefing.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto min-h-0 flex-1 pt-2">
          <UtcDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeChange={({ start, end }) => {
              setStartDate(start);
              setEndDate(end);
            }}
            onReset={() => {
              const today = utcToday();
              setStartDate(today);
              setEndDate(today);
            }}
            showAllTime={false}
            defaultPreset="today"
            stackLayout
            commitOnSelect
            disabled={isBusy}
          />
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:justify-stretch">
          <Button
            type="button"
            className="w-full"
            disabled={isBusy}
            onClick={() => void handleExport()}
            aria-label={isExporting ? 'Exporting…' : 'Export visits and travel'}
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            Export visits and travel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isBusy}
            onClick={() => void handleAnalysis()}
            aria-label={isAnalysing ? 'Building analysis…' : 'Analysis'}
          >
            {isAnalysing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileText className="size-4" aria-hidden />
            )}
            Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
