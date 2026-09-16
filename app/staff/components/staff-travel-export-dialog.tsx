'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApiClient } from '@/api/hooks';
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

/**
 * Date-range dialog that downloads the reports travel Excel workbook for one staff member.
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

  useEffect(() => {
    if (!open) return;
    const today = utcToday();
    setStartDate(today);
    setEndDate(today);
    setIsExporting(false);
  }, [open]);

  /**
   * Downloads the 5-sheet travel workbook scoped to this user and the selected UTC range.
   */
  async function handleExport() {
    if (isExporting) return;
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
            Choose a date range, then export this user's visits and travel as Excel.
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
            disabled={isExporting}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            className="w-full"
            disabled={isExporting}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
