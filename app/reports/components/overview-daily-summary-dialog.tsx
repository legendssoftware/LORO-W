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
import type { OverviewDailySummaryRow } from '@/app/reports/utils/overview-daily-summary';

export interface OverviewDailySummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** YYYY-MM-DD (UTC) */
  summaryDateYmd: string;
  /** e.g. branch / user filter description */
  scopeDescription: string;
  rows: OverviewDailySummaryRow[];
  isLoading: boolean;
  errorMessage: string | null;
}

export function OverviewDailySummaryDialog({
  open,
  onOpenChange,
  summaryDateYmd,
  scopeDescription,
  rows,
  isLoading,
  errorMessage,
}: OverviewDailySummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Daily summary</DialogTitle>
          <DialogDescription className="text-left">
            UTC date <span className="font-mono tabular-nums">{summaryDateYmd}</span>
            {scopeDescription ? (
              <>
                <span className="text-muted-foreground"> · </span>
                {scopeDescription}
              </>
            ) : null}
            <span className="block text-xs text-muted-foreground mt-1">
              Visits: all check-in types (same as Visits tab). Leads: activity in range
              (GET /leads/report, dateBasis=activity). Per-user lead counts use owner
              display name; duplicate names can share the same total.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto -mx-1 px-1">
          {isLoading ? (
            <LoadingSpinner wrapperClassName="py-12" />
          ) : errorMessage ? (
            <p className="text-sm text-destructive py-4">{errorMessage}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No users in scope for this selection.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">User, branch & contacts</TableHead>
                  <TableHead className="text-right w-[140px]">Visits / leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.uid}>
                    <TableCell className="align-top">
                      <div className="font-medium">{r.fullName}</div>
                      <div className="text-muted-foreground text-sm">{r.branchLabel}</div>
                      <div className="text-muted-foreground text-sm mt-1 break-words">
                        {r.contacts}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-right font-mono tabular-nums text-sm">
                      <span>{r.visits}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span>{r.leads}</span>
                    </TableCell>
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
