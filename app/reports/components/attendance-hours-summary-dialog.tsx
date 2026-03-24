'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/loading-spinner';
import type { AttendanceReportUserMetric } from '@/api/types';

function resolveHoursDisplay(metrics: AttendanceReportUserMetric['metrics']): string {
  const th = metrics?.totalHours as unknown;
  if (th != null && typeof th === 'object' && 'thisMonth' in th) {
    const v = (th as { thisMonth?: number }).thisMonth;
    if (typeof v === 'number') return `${v}h`;
  }
  if (typeof th === 'number') return `${th}h`;
  return '—';
}

function resolveShiftsDisplay(metrics: AttendanceReportUserMetric['metrics']): string {
  const ts = metrics?.totalShifts as unknown;
  if (ts != null && typeof ts === 'object' && 'thisMonth' in ts) {
    const v = (ts as { thisMonth?: number }).thisMonth;
    if (typeof v === 'number') return String(v);
  }
  if (typeof ts === 'number') return String(ts);
  return '—';
}

export interface AttendanceHoursSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userMetrics: AttendanceReportUserMetric[];
  isLoading: boolean;
  periodLabel?: string;
}

export function AttendanceHoursSummaryDialog({
  open,
  onOpenChange,
  userMetrics,
  isLoading,
  periodLabel,
}: AttendanceHoursSummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Hours summary</DialogTitle>
          <DialogDescription>
            {periodLabel
              ? `Per-user hours and shifts for ${periodLabel}.`
              : 'Per-user hours and shifts for the selected filters and date range.'}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <LoadingSpinner wrapperClassName="py-12" />
        ) : userMetrics.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No user metrics for this period.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Shifts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userMetrics.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell className="font-medium">
                    {(row.userInfo?.name ?? '').trim() || `User ${row.userId}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.userInfo?.email ?? '—'}
                  </TableCell>
                  <TableCell>{row.userInfo?.branch ?? '—'}</TableCell>
                  <TableCell>{row.userInfo?.role ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {resolveHoursDisplay(row.metrics)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {resolveShiftsDisplay(row.metrics)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
