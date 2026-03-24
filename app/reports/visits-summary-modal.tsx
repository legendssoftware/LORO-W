'use client';

import { format } from 'date-fns';
import type { VisitExportItem } from '@/api/types/reports';
import { VISITS_DISPLAY_COLUMNS } from '@/components/visits-table/visits-table';
import { visitsColumnWidthClass } from '@/components/visits-table/visits-table-utils';
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
    const dateRangeStr = useAllTime
        ? 'All time'
        : startDate.getTime() === endDate.getTime()
          ? format(startDate, 'PPP')
          : `${format(startDate, 'PPP')} – ${format(endDate, 'PPP')}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="relative flex flex-col max-w-[95vw] sm:max-w-[90vw] max-h-[90vh] overflow-hidden p-6 pt-12 pr-14"
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
                    <Table className="min-w-max">
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                {VISITS_DISPLAY_COLUMNS.map((col) => (
                                    <TableHead
                                        key={col.key}
                                        className={cn(
                                            'text-black font-medium whitespace-nowrap',
                                            visitsColumnWidthClass(col.width)
                                        )}
                                    >
                                        {col.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {checkIns.map((c, index) => (
                                <TableRow
                                    key={c.uid}
                                    className={cn(
                                        'border-b',
                                        index % 2 === 0
                                            ? 'bg-gray-100/80'
                                            : 'bg-white'
                                    )}
                                >
                                    {VISITS_DISPLAY_COLUMNS.map((col) => (
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
                {checkIns.length === 0 && (
                    <p className="text-center text-black py-4">
                        No visits to show.
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
