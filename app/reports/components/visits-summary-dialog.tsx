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
import { VISITS_DISPLAY_COLUMNS } from '@/components/visits-table/visits-table';
import { visitsColumnWidthClass } from '@/components/visits-table/visits-table-utils';
import { cn } from '@/lib/utils';
import type { VisitExportItem } from '@/api/types/reports';

export interface VisitsSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visits: VisitExportItem[];
  isLoading: boolean;
  periodLabel?: string;
}

export function VisitsSummaryDialog({
  open,
  onOpenChange,
  visits,
  isLoading,
  periodLabel,
}: VisitsSummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col overflow-hidden sm:max-w-[95vw] lg:max-w-[90vw] p-6 gap-4">
        <DialogHeader className="shrink-0">
          <DialogTitle>Visits summary</DialogTitle>
          <DialogDescription>
            {periodLabel
              ? `All visits matching filters for ${periodLabel}.`
              : 'All visits matching the selected filters and date range.'}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <LoadingSpinner wrapperClassName="py-12" />
        ) : visits.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No visits for this period.
          </p>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto border rounded-md">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {VISITS_DISPLAY_COLUMNS.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        'whitespace-nowrap font-medium',
                        visitsColumnWidthClass(col.width)
                      )}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((c, index) => (
                  <TableRow
                    key={c.uid}
                    className={cn(
                      'border-b',
                      index % 2 === 0 ? 'bg-muted/30' : 'bg-background'
                    )}
                  >
                    {VISITS_DISPLAY_COLUMNS.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'text-sm whitespace-normal align-top min-w-0',
                          visitsColumnWidthClass(col.width)
                        )}
                      >
                        {col.render(c)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
