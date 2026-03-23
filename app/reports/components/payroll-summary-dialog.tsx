'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { DailyOverviewUser } from '@/api/types/attendance';
import type { MonthlyMetricsUserItem } from '@/api/types';
import type { PayrollHoursAllResponse } from '@/api/endpoints/attendance';
import { fromDailyOverviewMergeMonthly } from '@/app/reports/utils/from-daily-overview';

export interface PayrollSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payrollData: PayrollHoursAllResponse | null | undefined;
  payrollIsLoading: boolean;
  monthlyByUserId: Map<number, MonthlyMetricsUserItem>;
  presentUsers: DailyOverviewUser[];
  absentUsers: DailyOverviewUser[];
  yearForMetrics: number;
  monthForMetrics: number;
}

export function PayrollSummaryDialog({
  open,
  onOpenChange,
  payrollData,
  payrollIsLoading,
  monthlyByUserId,
  presentUsers,
  absentUsers,
  yearForMetrics,
  monthForMetrics,
}: PayrollSummaryDialogProps) {
  const cardUsersByUserId = useMemo(() => {
    const cards = fromDailyOverviewMergeMonthly(
      presentUsers,
      absentUsers,
      monthlyByUserId,
      { year: yearForMetrics, month: monthForMetrics }
    );
    const map = new Map(cards.map((c) => [c.userId, c]));
    return map;
  }, [presentUsers, absentUsers, monthlyByUserId, yearForMetrics, monthForMetrics]);

  const payrollTableRows = useMemo(() => {
    const metrics = payrollData?.userMetrics ?? [];
    return metrics.map((m) => {
      const card = cardUsersByUserId.get(m.userId);
      const monthly = monthlyByUserId.get(m.userId);
      return {
        userId: m.userId,
        name: card?.name ?? m.userName,
        photoURL: card?.photoURL ?? undefined,
        email: card?.email ?? null,
        phone: card?.phone ?? null,
        branch: card?.branch ?? null,
        role: card?.role ?? null,
        empCode: card?.hrID ?? null,
        payrollHours: m.payrollHours,
        totalHours: monthly?.totalHours ?? null,
      };
    });
  }, [payrollData?.userMetrics, cardUsersByUserId, monthlyByUserId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:w-[70vw] sm:max-w-[70vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Attendance & Payroll Summary</DialogTitle>
          {payrollData && (
            <p className="text-sm text-muted-foreground mt-1">
              Period:{' '}
              {format(new Date(payrollData.period.startDate), 'MMM d, yyyy')} –{' '}
              {format(new Date(payrollData.period.endDate), 'MMM d, yyyy')}
            </p>
          )}
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto -mx-1 px-1">
          {payrollIsLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading payroll data…</p>
          ) : !payrollData ? (
            <p className="text-sm text-muted-foreground py-4">Unable to load payroll data.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Emp Code</TableHead>
                  <TableHead>Holiday Hours</TableHead>
                  <TableHead>Time Over</TableHead>
                  <TableHead>Sundays</TableHead>
                  <TableHead className="h-auto whitespace-normal py-2 align-bottom text-right">
                    <span className="block leading-tight">Total Hours</span>
                    <span className="text-muted-foreground text-xs font-normal block leading-tight">
                      (this month {format(new Date(yearForMetrics, monthForMetrics - 1), 'MMM yyyy')})
                    </span>
                  </TableHead>
                  <TableHead className="h-auto whitespace-normal py-2 align-bottom text-right">
                    <span className="block leading-tight">Payroll Hours</span>
                    <span className="text-muted-foreground text-xs font-normal block leading-tight">
                      {payrollData.period?.startDate && payrollData.period?.endDate
                        ? `(${format(new Date(payrollData.period.startDate), 'd MMM')} - ${format(new Date(payrollData.period.endDate), 'd MMM')})`
                        : '(current payroll period)'}
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollTableRows.map((row, index) => (
                  <TableRow key={row.userId} className={index % 2 === 1 ? 'bg-muted/50' : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8 shrink-0">
                          <AvatarImage src={row.photoURL} />
                          <AvatarFallback>
                            {row.name
                              .split(/\s+/)
                              .map((s) => s[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{row.name}</p>
                          {row.email && (
                            <a href={`mailto:${row.email}`} className="block text-xs text-primary hover:underline truncate">
                              {row.email}
                            </a>
                          )}
                          {row.phone && (
                            <a href={`tel:${row.phone}`} className="block text-xs text-primary hover:underline truncate">
                              {row.phone}
                            </a>
                          )}
                          <p className="text-xs text-muted-foreground truncate">Branch: {row.branch || '—'}</p>
                          <p className="text-xs text-muted-foreground truncate">Role: {row.role || '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{row.empCode != null ? String(row.empCode) : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                        row.totalHours != null ? 'tabular-nums font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {row.totalHours != null ? `${row.totalHours}h` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{row.payrollHours}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
