'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import type { VisitExportItem } from '@/api/types/reports';
import {
  groupCheckInsByOwner,
  VISITS_DISPLAY_COLUMNS,
  VISITS_TABLE_COLUMNS,
} from '@/components/visits-table/visits-table';
import { visitsColumnWidthClass } from '@/components/visits-table/visits-table-utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DetailDialogCloseButton } from '@/components/detail-dialog/detail-dialog-primitives';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface VisitsSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkIns: VisitExportItem[];
  startDate: Date;
  endDate: Date;
  runAt: Date | null;
  companyName: string;
  useAllTime?: boolean;
}

/** Snapshot passed when opening the modal (e.g. from `VisitsContent`); `runAt` is set by the page shell. */
export type VisitsSummaryModalPayload = Omit<
  VisitsSummaryModalProps,
  'open' | 'onOpenChange' | 'runAt'
>;

export function VisitsSummaryModal({
  open,
  onOpenChange,
  checkIns,
  startDate,
  endDate,
  runAt,
  companyName,
  useAllTime = false,
}: VisitsSummaryModalProps) {
  const [expandedOwnerKey, setExpandedOwnerKey] = useState<string | null>(null);

  const groupedByOwner = useMemo(
    () => groupCheckInsByOwner(checkIns),
    [checkIns]
  );

  const dateRangeStr = useAllTime
    ? 'All time'
    : startDate.getTime() === endDate.getTime()
      ? format(startDate, 'PPP')
      : `${format(startDate, 'PPP')} – ${format(endDate, 'PPP')}`;

  const salesPersonColumn = VISITS_DISPLAY_COLUMNS.find(
    (col) => col.key === 'salesPerson'
  )!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col max-w-[95vw] sm:max-w-[90vw] max-h-[90vh] overflow-hidden p-6 pt-12 pr-14"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-10">
          <DetailDialogCloseButton />
        </div>
        <DialogHeader className="pr-24">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Visits Summary
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm text-foreground">
          <p className="font-medium text-black">{companyName}</p>
          <p className="text-black">Date: {dateRangeStr}</p>
          <p className="text-black">
            Run at: {runAt ? format(runAt, 'HH:mm') : '—'}
          </p>
        </div>
        <div className="flex-1 min-h-0 overflow-auto border rounded-md">
          {checkIns.length === 0 ? (
            <p className="text-center text-black py-4">No visits to show.</p>
          ) : (
            <div className="rounded-sm overflow-x-auto bg-card">
              <div className="divide-y divide-border">
                {groupedByOwner.map((group, index) => {
                  const isExpanded = expandedOwnerKey === group.ownerKey;
                  const contentId = `visits-summary-${group.ownerKey}`;
                  return (
                    <div
                      key={group.ownerKey}
                      className={cn('rounded-sm', isExpanded && 'ring-1 ring-green-200')}
                    >
                      <Collapsible
                        open={isExpanded}
                        onOpenChange={(open) =>
                          setExpandedOwnerKey(open ? group.ownerKey : null)
                        }
                      >
                        <CollapsibleTrigger
                          asChild
                          className="w-full"
                          aria-expanded={isExpanded}
                          aria-controls={contentId}
                        >
                          <div
                            className={cn(
                              'flex items-center gap-4 px-4 py-3 text-left cursor-pointer hover:bg-muted/50 transition-colors border-0 rounded-none',
                              index % 2 === 1 ? 'bg-muted/50' : 'bg-card',
                              isExpanded && 'bg-muted/30'
                            )}
                          >
                            <span className="flex items-start gap-2 whitespace-normal min-w-0 flex-1">
                              {group.ownerKey === '__unknown__' ? (
                                <span className="text-muted-foreground font-medium">
                                  Unknown
                                </span>
                              ) : (
                                salesPersonColumn.render(group.visits[0])
                              )}
                            </span>
                            <span className="text-sm text-muted-foreground shrink-0">
                              {group.visits.length} visit
                              {group.visits.length !== 1 ? 's' : ''}
                            </span>
                            <ChevronRight
                              className={cn(
                                'size-5 shrink-0 text-muted-foreground transition-transform',
                                isExpanded && 'rotate-90'
                              )}
                              aria-hidden
                            />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent
                          id={contentId}
                          className="overflow-hidden"
                        >
                          <div className="bg-muted/20 border-t border-border overflow-x-auto">
                            <Table className="min-w-max">
                              <TableHeader>
                                <TableRow>
                                  {VISITS_TABLE_COLUMNS.map((col) => (
                                    <TableHead
                                      key={col.key}
                                      className={cn(
                                        'whitespace-nowrap text-black font-medium',
                                        visitsColumnWidthClass(col.width)
                                      )}
                                    >
                                      {col.label}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody className="[&>tr:nth-child(odd)]:bg-muted/50">
                                {group.visits.map((c) => (
                                  <TableRow
                                    key={c.uid}
                                    className="border-b-0"
                                  >
                                    {VISITS_TABLE_COLUMNS.map((col) => (
                                      <TableCell
                                        key={col.key}
                                        className={cn(
                                          'text-black text-sm whitespace-normal align-top min-w-0',
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
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
