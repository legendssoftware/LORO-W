'use client';

import { format, parseISO } from 'date-fns';
import { Banknote, Calendar, Download, FileText, Hash, Loader2Icon, User } from 'lucide-react';
import type { PayslipListItem } from '@/api/types/payslips';
import { usePayslipDocument } from '@/api/hooks/use-payslips';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DetailDialogCloseButton,
  DetailFieldRow,
  DetailSectionHeading,
  DETAIL_DIALOG_CONTENT_CLASS,
  DETAIL_FIELD_GRID_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import {
  buildPayslipFileName,
  formatPayslipAmount,
  formatPayslipEmployeeName,
  formatPayslipPeriod,
  payslipStatusLabel,
} from '@/lib/utils/payslips-format';
import toast from 'react-hot-toast';

function formatIssueDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    try {
      return format(new Date(value), 'dd MMM yyyy');
    } catch {
      return value;
    }
  }
}

function triggerDownload(url: string, fileName: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export interface PayslipDetailDialogProps {
  payslip: PayslipListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showEmployee?: boolean;
}

export function PayslipDetailDialog({
  payslip,
  open,
  onOpenChange,
  showEmployee = false,
}: PayslipDetailDialogProps) {
  const hasDocument = !!(payslip?.documentUrl || payslip?.documentRef);
  const documentQuery = usePayslipDocument(payslip?.uid, {
    enabled: open && hasDocument,
    skipErrorToast: true,
  });

  const previewUrl = documentQuery.data?.url;
  const fileName = payslip
    ? buildPayslipFileName(payslip, documentQuery.data?.fileName)
    : 'payslip.pdf';

  function handleDownloadClick() {
    if (!previewUrl) {
      toast.error('No document available for this payslip');
      return;
    }
    triggerDownload(previewUrl, fileName);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DETAIL_DIALOG_CONTENT_CLASS}>
        <DetailDialogCloseButton />
        <DialogHeader>
          <DialogTitle>
            {payslip ? formatPayslipPeriod(payslip.period) : 'Payslip'}
          </DialogTitle>
          <DialogDescription>
            View and download your payslip PDF.
          </DialogDescription>
        </DialogHeader>

        {payslip ? (
          <>
            <div className={DETAIL_FIELD_GRID_CLASS}>
              <DetailFieldRow
                label="Period"
                value={formatPayslipPeriod(payslip.period)}
                icon={Calendar}
              />
              <DetailFieldRow
                label="Issue date"
                value={formatIssueDate(payslip.issueDate)}
                icon={Calendar}
              />
              <DetailFieldRow
                label="Payslip number"
                value={payslip.payslipNumber?.trim() || '—'}
                icon={Hash}
              />
              <DetailFieldRow
                label="Status"
                value={payslipStatusLabel(payslip.status)}
                icon={FileText}
              />
              <DetailFieldRow
                label="Gross pay"
                value={formatPayslipAmount(payslip.grossPay)}
                icon={Banknote}
              />
              <DetailFieldRow
                label="Net pay"
                value={formatPayslipAmount(payslip.netPay)}
                icon={Banknote}
              />
              {showEmployee ? (
                <DetailFieldRow
                  label="Employee"
                  value={formatPayslipEmployeeName(payslip.user)}
                  icon={User}
                />
              ) : null}
            </div>

            <div className="mt-4">
              <DetailSectionHeading title="Document preview" icon={FileText} />
              {!hasDocument ? (
                <p className="text-sm text-muted-foreground">
                  No document is attached to this payslip.
                </p>
              ) : documentQuery.isLoading ? (
                <div className="flex h-[50vh] items-center justify-center rounded-lg border border-border bg-muted/30">
                  <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : documentQuery.isError || !previewUrl ? (
                <p className="text-sm text-destructive">
                  Could not load payslip document. Try again or contact support.
                </p>
              ) : (
                <iframe
                  title={`Payslip ${formatPayslipPeriod(payslip.period)}`}
                  src={previewUrl}
                  className="h-[50vh] w-full rounded-lg border border-border bg-white"
                />
              )}
            </div>
          </>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            className="gap-2 bg-violet-600 text-white hover:bg-violet-700"
            disabled={!previewUrl || documentQuery.isLoading}
            onClick={handleDownloadClick}
          >
            <Download className="size-4" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
