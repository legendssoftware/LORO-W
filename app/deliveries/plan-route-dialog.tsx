'use client';

import { useEffect, useState } from 'react';
import { MapPinned, Route } from 'lucide-react';
import { useAcceptRoutePlanMutation, usePlanRouteMutation } from '@/api/hooks';
import type { PlannedRouteStop } from '@/api/types/epod';
import { Button } from '@/components/ui/button';
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
  DetailDialogCloseButton,
} from '@/components/detail-dialog/detail-dialog-primitives';
import { LoadingSpinner } from '@/components/loading-spinner';
import { getQueryErrorMessage } from '@/lib/api/query-error';

export type PlanRouteTarget = {
  driverUid: number;
  routeCode: string;
  scheduledDate: string;
};

export type PlanRouteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: PlanRouteTarget | null;
};

/**
 * Dispatch Plan route: fetches a Google-optimized stop order, shows numbered stops,
 * and Accept writes stopSequence without closing until the write succeeds.
 */
export function PlanRouteDialog({ open, onOpenChange, target }: PlanRouteDialogProps) {
  const plan = usePlanRouteMutation();
  const accept = useAcceptRoutePlanMutation();
  const [stops, setStops] = useState<PlannedRouteStop[]>([]);

  useEffect(() => {
    if (!open || !target) {
      setStops([]);
      return;
    }
    let cancelled = false;
    setStops([]);
    void plan
      .mutateAsync({
        driverUid: target.driverUid,
        routeCode: target.routeCode,
        scheduledDate: target.scheduledDate,
      })
      .then((data) => {
        if (!cancelled) setStops(data.stops ?? []);
      })
      .catch(() => {
        if (!cancelled) setStops([]);
      });
    return () => {
      cancelled = true;
    };
    // Re-plan only when the dialog opens for a route key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.driverUid, target?.routeCode, target?.scheduledDate]);

  async function onAccept() {
    if (!target || stops.length === 0) return;
    try {
      await accept.mutateAsync({
        driverUid: target.driverUid,
        routeCode: target.routeCode,
        scheduledDate: target.scheduledDate,
        stops: stops.map((stop) => ({
          deliveryUid: stop.deliveryUid,
          stopSequence: stop.stopSequence,
        })),
      });
      onOpenChange(false);
    } catch {
      // Error banner is rendered via accept.isError.
    }
  }

  const isPlanning = plan.isPending;
  const planError = plan.isError ? getQueryErrorMessage(plan.error) : null;
  const acceptError = accept.isError ? getQueryErrorMessage(accept.error) : null;

  return (
    <Dialog open={open && target != null} onOpenChange={onOpenChange}>
      <DialogContent className={DETAIL_DIALOG_CONTENT_CLASS} showCloseButton={false}>
        <DetailDialogCloseButton />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="size-5 shrink-0" aria-hidden />
            Plan route
          </DialogTitle>
          <DialogDescription>
            Proposed stop order for route {target?.routeCode ?? '—'} on{' '}
            {target?.scheduledDate ?? '—'}. Accept writes the stop numbers; Cancel discards them.
          </DialogDescription>
        </DialogHeader>

        {isPlanning ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : null}

        {!isPlanning && planError ? (
          <p className="text-destructive text-sm">{planError}</p>
        ) : null}

        {!isPlanning && !planError && stops.length === 0 ? (
          <p className="text-muted-foreground text-sm">No open stops to plan on this route.</p>
        ) : null}

        {!isPlanning && stops.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {stops.map((stop) => (
              <li
                key={stop.deliveryUid}
                className="border-border bg-card flex items-start gap-3 rounded-md border px-3 py-3"
              >
                <span
                  className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold"
                  aria-label={`Stop ${stop.stopSequence}`}
                >
                  {stop.stopSequence}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium text-sm">{stop.clientName || 'No client'}</span>
                  <span className="text-muted-foreground text-xs">
                    {stop.clientAddress || 'No address'}
                  </span>
                  {stop.latitude == null || stop.longitude == null ? (
                    <span className="text-amber-700 dark:text-amber-300 text-xs">
                      No coordinates — placed after optimized stops
                    </span>
                  ) : null}
                </span>
                <MapPinned className="text-muted-foreground size-4 shrink-0" aria-hidden />
              </li>
            ))}
          </ol>
        ) : null}

        {acceptError ? <p className="text-destructive text-sm">{acceptError}</p> : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPlanning || accept.isPending || stops.length === 0 || Boolean(planError)}
            onClick={() => void onAccept()}
          >
            <Route className="size-4 shrink-0" aria-hidden />
            {accept.isPending ? 'Saving…' : 'Accept'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
