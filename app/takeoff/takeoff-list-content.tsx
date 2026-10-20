'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTakeoffs } from '@/api/hooks/use-takeoff';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { CreateTakeoffDialog } from '@/app/takeoff/create-takeoff-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatTakeoffMoney } from '@/app/takeoff/format';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { cn } from '@/lib/utils';

export function TakeoffListContent() {
  const query = useTakeoffs();
  const rows = query.data ?? [];
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System takeoff</h1>
          <p className="text-muted-foreground text-sm">
            Measure a ceiling or partition. Quantities are calculated on the server, then issued as a quotation.
          </p>
        </div>
        <Button
          type="button"
          className={cn(
            'border-0 bg-violet-600 text-white hover:bg-violet-700',
            'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
            'focus-visible:ring-violet-500/40',
          )}
          onClick={() => setCreateOpen(true)}
        >
          New takeoff
        </Button>
      </div>

      <CreateTakeoffDialog open={createOpen} onOpenChange={setCreateOpen} />

      {query.isLoading ? <LoadingSpinner /> : null}
      {query.isError ? (
        <p className="text-destructive text-sm">{getQueryErrorMessage(query.error)}</p>
      ) : null}

      {!query.isLoading && rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No takeoffs yet.</p>
      ) : null}

      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quotation</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.uid}>
                <TableCell>
                  <Link className="font-medium underline-offset-4 hover:underline" href={`/takeoff/${row.uid}`}>
                    {row.reference?.trim() || `Takeoff ${row.uid}`}
                  </Link>
                </TableCell>
                <TableCell>{row.clientName || '—'}</TableCell>
                <TableCell className="capitalize">{row.status}</TableCell>
                <TableCell>{row.quotationNumber || '—'}</TableCell>
                <TableCell className="text-right">{formatTakeoffMoney(row.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
