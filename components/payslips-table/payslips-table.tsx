'use client';

import { format, parseISO } from 'date-fns';
import { Download, Eye, FileText, Loader2Icon } from 'lucide-react';
import type { PayslipListItem } from '@/api/types/payslips';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatPayslipAmount,
  formatPayslipEmployeeName,
  formatPayslipPeriod,
  payslipStatusBadgeClass,
  payslipStatusLabel,
} from '@/lib/utils/payslips-format';
import { cn } from '@/lib/utils';

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

function hasDocument(payslip: PayslipListItem): boolean {
  return !!(payslip.documentUrl || payslip.documentRef);
}

export function PayslipsTableSkeleton({
  rows = 5,
  showEmployeeColumn = false,
}: {
  rows?: number;
  showEmployeeColumn?: boolean;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          {showEmployeeColumn ? (
            <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
          ) : null}
          <TableCell><Skeleton className="ml-auto h-8 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export interface PayslipsTableProps {
  payslips: PayslipListItem[];
  isLoading?: boolean;
  showEmployeeColumn?: boolean;
  downloadingId?: number | null;
  onView: (payslip: PayslipListItem) => void;
  onDownload: (payslip: PayslipListItem) => void;
}

export function PayslipsTable({
  payslips,
  isLoading = false,
  showEmployeeColumn = false,
  downloadingId = null,
  onView,
  onDownload,
}: PayslipsTableProps) {
  const colCount = showEmployeeColumn ? 8 : 7;

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Issue date</TableHead>
            <TableHead>Payslip #</TableHead>
            <TableHead className="hidden sm:table-cell">Gross</TableHead>
            <TableHead className="hidden md:table-cell">Net</TableHead>
            <TableHead>Status</TableHead>
            {showEmployeeColumn ? (
              <TableHead className="hidden lg:table-cell">Employee</TableHead>
            ) : null}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <PayslipsTableSkeleton showEmployeeColumn={showEmployeeColumn} />
          ) : payslips.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colCount} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FileText className="size-8 opacity-50" aria-hidden />
                  <p className="text-sm font-medium">No payslips found</p>
                  <p className="text-xs">Try adjusting your date range or filters.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            payslips.map((payslip) => {
              const docAvailable = hasDocument(payslip);
              const isDownloading = downloadingId === payslip.uid;
              return (
                <TableRow
                  key={payslip.uid}
                  className={cn(docAvailable && 'cursor-pointer hover:bg-muted/50')}
                  onClick={() => {
                    if (docAvailable) onView(payslip);
                  }}
                >
                  <TableCell className="font-medium">
                    {formatPayslipPeriod(payslip.period)}
                  </TableCell>
                  <TableCell>{formatIssueDate(payslip.issueDate)}</TableCell>
                  <TableCell>{payslip.payslipNumber?.trim() || '—'}</TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums">
                    {formatPayslipAmount(payslip.grossPay)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">
                    {formatPayslipAmount(payslip.netPay)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        payslipStatusBadgeClass(payslip.status)
                      )}
                    >
                      {payslipStatusLabel(payslip.status)}
                    </span>
                  </TableCell>
                  {showEmployeeColumn ? (
                    <TableCell className="hidden lg:table-cell">
                      {formatPayslipEmployeeName(payslip.user)}
                    </TableCell>
                  ) : null}
                  <TableCell className="text-right">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={!docAvailable}
                        aria-label="View payslip"
                        onClick={() => onView(payslip)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={!docAvailable || isDownloading}
                        aria-label="Download payslip"
                        onClick={() => onDownload(payslip)}
                      >
                        {isDownloading ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <Download className="size-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
