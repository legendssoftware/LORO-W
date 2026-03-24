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
import type { LeadListItem } from '@/api/types/leads';

export interface LeadsSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: LeadListItem[];
  isLoading: boolean;
  periodLabel?: string;
}

function formatMoney(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(n);
}

export function LeadsSummaryDialog({
  open,
  onOpenChange,
  leads,
  isLoading,
  periodLabel,
}: LeadsSummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Leads summary</DialogTitle>
          <DialogDescription>
            {periodLabel
              ? `Leads in range ${periodLabel} matching filters.`
              : 'Leads matching the selected filters and date range.'}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <LoadingSpinner wrapperClassName="py-12" />
        ) : leads.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No leads for this period.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((row) => {
                const ownerName =
                  [row.owner?.name, row.owner?.surname]
                    .filter(Boolean)
                    .join(' ')
                    .trim() || row.owner?.email || '—';
                return (
                  <TableRow key={row.uid}>
                    <TableCell className="font-medium">
                      {row.name?.trim() || `Lead #${row.uid}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.companyName ?? '—'}
                    </TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.source ?? '—'}</TableCell>
                    <TableCell>{ownerName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.estimatedValue)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString()
                        : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
