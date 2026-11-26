'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { CheckCircle2, PackageCheck } from 'lucide-react';
import { useMarkRouteReadyMutation } from '@/api/hooks';
import type { DeliverySummary } from '@/api/types/epod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DETAIL_DIALOG_CONTENT_CLASS,
  DETAIL_DIALOG_SMALL_CONTENT_CLASS,
  DetailDialogCloseButton,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { cn } from '@/lib/utils';
import { markLoadedButtonClassName } from '@/app/deliveries/format';

export type MarkLoadedRouteTarget = {
  driverUid: number;
  routeCode: string;
  scheduledDate: string;
};

export type MarkLoadedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: MarkLoadedRouteTarget | null;
  /** All deliveries visible on the page; filtered to this route when open. */
  deliveries: DeliverySummary[];
};

/** Open stops on a route that still need warehouse load acknowledgment. */
function openStopsForRoute(
  deliveries: DeliverySummary[],
  target: MarkLoadedRouteTarget,
): DeliverySummary[] {
  return deliveries
    .filter(
      (row) =>
        row.driverUid === target.driverUid &&
        row.routeCode === target.routeCode &&
        row.scheduledDate === target.scheduledDate &&
        !row.routeReady &&
        (row.status === 'assigned' || row.status === 'in_progress'),
    )
    .slice()
    .sort((a, b) => {
      const seqA = a.stopSequence ?? Number.MAX_SAFE_INTEGER;
      const seqB = b.stopSequence ?? Number.MAX_SAFE_INTEGER;
      if (seqA !== seqB) return seqA - seqB;
      return a.uid - b.uid;
    });
}

/**
 * Warehouse load checklist: check each invoice on the route, Confirm loads,
 * then show a green success modal. Credit note + GRV flags persist before ready.
 */
export function MarkLoadedDialog({ open, onOpenChange, target, deliveries }: MarkLoadedDialogProps) {
  const markReady = useMarkRouteReadyMutation();
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [creditNotes, setCreditNotes] = useState<Set<number>>(() => new Set());
  const [grvs, setGrvs] = useState<Set<number>>(() => new Set());
  const [routeCreditNote, setRouteCreditNote] = useState(false);
  const [routeGrv, setRouteGrv] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const stops = useMemo(
    () => (target ? openStopsForRoute(deliveries, target) : []),
    [deliveries, target],
  );

  const targetKey = target
    ? `${target.driverUid}:${target.routeCode}:${target.scheduledDate}`
    : null;

  useEffect(() => {
    if (!open || !targetKey) {
      setChecked(new Set());
      setCreditNotes(new Set());
      setGrvs(new Set());
      setRouteCreditNote(false);
      setRouteGrv(false);
      return;
    }
    setChecked(new Set(stops.filter((stop) => stop.loadedChecked === true).map((stop) => stop.uid)));
    setCreditNotes(
      new Set(stops.filter((stop) => stop.creditNotePassed === true).map((stop) => stop.uid)),
    );
    setGrvs(new Set(stops.filter((stop) => stop.grvDone === true).map((stop) => stop.uid)));
    setRouteCreditNote(stops.length > 0 && stops.every((stop) => stop.creditNotePassed === true));
    setRouteGrv(stops.length > 0 && stops.every((stop) => stop.grvDone === true));
    // Seed only when opening or switching route target so background refetches do not undo user toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targetKey]);

  const allChecked = stops.length > 0 && stops.every((stop) => checked.has(stop.uid));

  function toggleUid(setter: Dispatch<SetStateAction<Set<number>>>, uid: number, next: boolean) {
    setter((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(uid);
      else copy.delete(uid);
      return copy;
    });
  }

  function applyRouteCreditNote(next: boolean) {
    setRouteCreditNote(next);
    setCreditNotes(next ? new Set(stops.map((stop) => stop.uid)) : new Set());
  }

  function applyRouteGrv(next: boolean) {
    setRouteGrv(next);
    setGrvs(next ? new Set(stops.map((stop) => stop.uid)) : new Set());
  }

  async function onConfirm() {
    if (!target || !allChecked) return;
    try {
      await markReady.mutateAsync({
        driverUid: target.driverUid,
        routeCode: target.routeCode,
        scheduledDate: target.scheduledDate,
        deliveryUids: stops.map((stop) => stop.uid),
        ...(routeCreditNote ? { creditNotePassed: true } : {}),
        ...(routeGrv ? { grvDone: true } : {}),
        deliveryFlags: stops.map((stop) => ({
          uid: stop.uid,
          creditNotePassed: creditNotes.has(stop.uid),
          grvDone: grvs.has(stop.uid),
        })),
      });
      onOpenChange(false);
      setSuccessOpen(true);
    } catch {
      // Error banner is rendered via markReady.isError.
    }
  }

  return (
    <>
      <Dialog open={open && target != null} onOpenChange={onOpenChange}>
        <DialogContent className={DETAIL_DIALOG_CONTENT_CLASS} showCloseButton={false}>
          <DetailDialogCloseButton />
          <DialogHeader>
            <DialogTitle>Mark as Loaded</DialogTitle>
            <DialogDescription>
              Check each invoice on route {target?.routeCode ?? '—'} for{' '}
              {target?.scheduledDate ?? '—'} before confirming the warehouse load. Confirm credit
              note and GRV where required.
            </DialogDescription>
          </DialogHeader>

          {stops.length === 0 ? (
            <p className="text-muted-foreground text-sm">No open invoices on this route.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="border-border flex flex-col gap-2 rounded-md border px-3 py-3 sm:flex-row sm:gap-6">
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox
                    checked={routeCreditNote}
                    onCheckedChange={(value) => applyRouteCreditNote(value === true)}
                    aria-label="Credit note passed for all invoices"
                    className="mt-0.5"
                  />
                  <span className="font-medium">Credit note passed (all)</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox
                    checked={routeGrv}
                    onCheckedChange={(value) => applyRouteGrv(value === true)}
                    aria-label="GRV done for all invoices"
                    className="mt-0.5"
                  />
                  <span className="font-medium">GRV done (all)</span>
                </label>
              </div>

              <ul className="flex flex-col gap-2">
                {stops.map((stop) => {
                  const isChecked = checked.has(stop.uid);
                  const invoice = stop.invoiceNumber || stop.orderNumber || '—';
                  return (
                    <li key={stop.uid}>
                      <div
                        className={cn(
                          'border-border flex flex-col gap-2 rounded-md border px-3 py-3',
                          isChecked ? 'border-emerald-500/40 bg-emerald-500/5' : 'bg-card',
                        )}
                      >
                        <label className="flex cursor-pointer items-start gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(value) =>
                              toggleUid(setChecked, stop.uid, value === true)
                            }
                            aria-label={`Loaded ${stop.deliveryNumber}`}
                            className="mt-0.5"
                          />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="font-medium text-sm">{stop.deliveryNumber}</span>
                            <span className="text-muted-foreground text-xs">
                              {stop.clientName || 'No client'}
                              {' · '}
                              Invoice {invoice}
                            </span>
                          </span>
                        </label>
                        <div className="ml-7 flex flex-wrap gap-4">
                          <label className="flex cursor-pointer items-center gap-2 text-xs">
                            <Checkbox
                              checked={creditNotes.has(stop.uid)}
                              onCheckedChange={(value) => {
                                setRouteCreditNote(false);
                                toggleUid(setCreditNotes, stop.uid, value === true);
                              }}
                              aria-label={`Credit note passed for ${stop.deliveryNumber}`}
                            />
                            Credit note passed
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-xs">
                            <Checkbox
                              checked={grvs.has(stop.uid)}
                              onCheckedChange={(value) => {
                                setRouteGrv(false);
                                toggleUid(setGrvs, stop.uid, value === true);
                              }}
                              aria-label={`GRV done for ${stop.deliveryNumber}`}
                            />
                            GRV done
                          </label>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {markReady.isError ? (
            <p className="text-destructive text-sm">{getQueryErrorMessage(markReady.error)}</p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(markLoadedButtonClassName, 'border')}
              disabled={!allChecked || markReady.isPending || stops.length === 0}
              onClick={() => void onConfirm()}
            >
              <PackageCheck className="size-4 shrink-0" aria-hidden />
              {markReady.isPending ? 'Confirming…' : 'Confirm loads'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className={DETAIL_DIALOG_SMALL_CONTENT_CLASS} showCloseButton={false}>
          <DetailDialogCloseButton />
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-9" aria-hidden />
            </div>
            <DialogHeader className="items-center space-y-2 text-center sm:text-center">
              <DialogTitle className="text-emerald-800 dark:text-emerald-200">
                All items have been loaded
              </DialogTitle>
              <DialogDescription>
                The warehouse load is marked ready. Customers and the driver have been notified.
              </DialogDescription>
            </DialogHeader>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setSuccessOpen(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
