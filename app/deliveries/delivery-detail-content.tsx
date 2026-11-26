'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, ExternalLink, FileText, PackageCheck, Route, XCircle } from 'lucide-react';
import {
  canCancelDelivery,
  useDeliveries,
  useDelivery,
  useDeliveryPdfMutation,
  useSessionSync,
  useTokenReady,
} from '@/api/hooks';
import { canDispatchDeliveries } from '@/lib/access';
import type { DeliverySummary } from '@/api/types/epod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { cn } from '@/lib/utils';
import {
  CancelDeliveryDialog,
  type CancelDeliveryTarget,
} from '@/app/deliveries/cancel-delivery-form';
import { InvoiceItemsDialog } from '@/app/deliveries/invoice-items-dialog';
import { ReassignInvoiceDialog } from '@/app/deliveries/reassign-invoice-dialog';
import {
  MarkLoadedDialog,
  type MarkLoadedRouteTarget,
} from '@/app/deliveries/mark-loaded-dialog';
import {
  PlanRouteDialog,
  type PlanRouteTarget,
} from '@/app/deliveries/plan-route-dialog';
import {
  deliveryStatusClassName,
  formatCancellationReason,
  formatCoordinates,
  formatDeliveryException,
  formatDeliveryStatus,
  formatDeliveryTimestamp,
  formatDeliveryType,
  formatWeightKg,
  loadedReadyButtonClassName,
  markLoadedButtonClassName,
  routePlannedButtonClassName,
} from '@/app/deliveries/format';
import { useTranslation } from 'react-i18next';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export function DeliveryDetailContent({
  uid,
  onClose,
  onRequestCancel,
}: {
  uid: number;
  /** When set, Back and a successful cancel close the host dialog instead of leaving the page. */
  onClose?: () => void;
  /** When set, clicking Cancel delivery closes the detail modal and opens the host's focused cancel modal. */
  onRequestCancel?: (target: CancelDeliveryTarget) => void;
}) {
  const { t } = useTranslation('screens');
  const router = useRouter();
  const embedded = onClose != null;
  const query = useDelivery(uid);
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const canDispatch = canDispatchDeliveries(backendUserData);
  const pdf = useDeliveryPdfMutation(uid);
  const [markLoadedTarget, setMarkLoadedTarget] = useState<MarkLoadedRouteTarget | null>(null);
  const [planRouteTarget, setPlanRouteTarget] = useState<PlanRouteTarget | null>(null);
  const [localCancelTarget, setLocalCancelTarget] = useState<CancelDeliveryTarget | null>(null);
  const [selectedInvoiceUid, setSelectedInvoiceUid] = useState<number | null>(null);
  const [reassignTarget, setReassignTarget] = useState<DeliverySummary | null>(null);

  const delivery = query.data;
  const pdfAutoFetchedRef = useRef<number | null>(null);
  const dayList = useDeliveries(
    delivery?.scheduledDate ? { date: delivery.scheduledDate } : {},
    isTokenReady && Boolean(delivery?.scheduledDate),
  );

  const routeInvoices = useMemo<DeliverySummary[]>(() => {
    if (!delivery) return [];
    const list = dayList.data?.deliveries ?? [];
    const matched = list.filter(
      (row) =>
        row.driverUid === delivery.driverUid &&
        row.routeCode === delivery.routeCode &&
        row.scheduledDate === delivery.scheduledDate,
    );
    const source = matched.length > 0 ? matched : [delivery];
    return source.slice().sort((a, b) => {
      const seqA = a.stopSequence ?? Number.MAX_SAFE_INTEGER;
      const seqB = b.stopSequence ?? Number.MAX_SAFE_INTEGER;
      if (seqA !== seqB) return seqA - seqB;
      return a.uid - b.uid;
    });
  }, [dayList.data?.deliveries, delivery]);

  // Auto-prepare the signed ePOD PDF when viewing a recorded delivery so it renders inline immediately.
  useEffect(() => {
    if (
      delivery?.status === 'recorded' &&
      !delivery.pdfUrl &&
      !pdf.data?.url &&
      !pdf.isPending &&
      pdfAutoFetchedRef.current !== delivery.uid
    ) {
      pdfAutoFetchedRef.current = delivery.uid;
      void pdf.mutateAsync().catch(() => {
        // Error banner is rendered via pdf.isError.
      });
    }
  }, [delivery?.uid, delivery?.status, delivery?.pdfUrl, pdf]);

  if (query.isLoading) {
    return (
      <div className={embedded ? undefined : 'p-6'}>
        <LoadingSpinner />
      </div>
    );
  }

  if (query.isError || !delivery) {
    return (
      <p className={embedded ? 'text-destructive text-sm' : 'text-destructive p-6 text-sm'}>
        {getQueryErrorMessage(query.error)}
      </p>
    );
  }

  const showCancel = canDispatch && canCancelDelivery(delivery.status);
  const showReady =
    canDispatch &&
    (delivery.status === 'assigned' || delivery.status === 'in_progress') &&
    delivery.routeCode.trim().length > 0 &&
    delivery.driverUid > 0 &&
    delivery.scheduledDate.trim().length > 0;
  const showPlanRoute = showReady;
  const pdfUrl = delivery.pdfUrl ?? pdf.data?.url ?? null;
  const checklistDeliveries: DeliverySummary[] = dayList.data?.deliveries?.length
    ? dayList.data.deliveries
    : [delivery];

  function triggerCancel(target: CancelDeliveryTarget) {
    if (onRequestCancel) {
      onRequestCancel(target);
      return;
    }
    setLocalCancelTarget(target);
  }

  return (
    <div className={embedded ? 'flex flex-col gap-6' : 'flex flex-col gap-6 p-4 md:p-6'}>
      {canDispatch && !onRequestCancel ? (
        <CancelDeliveryDialog
          target={localCancelTarget}
          open={localCancelTarget != null}
          onOpenChange={(open) => {
            if (!open) setLocalCancelTarget(null);
          }}
          onCancelled={() => {
            if (onClose) {
              onClose();
              return;
            }
            router.push('/deliveries');
          }}
        />
      ) : null}
      <InvoiceItemsDialog
        deliveryUid={selectedInvoiceUid}
        open={selectedInvoiceUid != null}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoiceUid(null);
        }}
      />
      {canDispatch ? (
        <ReassignInvoiceDialog
          delivery={reassignTarget}
          open={reassignTarget != null}
          onOpenChange={(open) => {
            if (!open) setReassignTarget(null);
          }}
        />
      ) : null}
      {canDispatch ? (
        <MarkLoadedDialog
          open={markLoadedTarget != null}
          onOpenChange={(open) => {
            if (!open) setMarkLoadedTarget(null);
          }}
          target={markLoadedTarget}
          deliveries={checklistDeliveries}
        />
      ) : null}
      {canDispatch ? (
        <PlanRouteDialog
          open={planRouteTarget != null}
          onOpenChange={(open) => {
            if (!open) setPlanRouteTarget(null);
          }}
          target={planRouteTarget}
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{delivery.deliveryNumber}</h1>
          <p className="text-muted-foreground text-sm">
            {delivery.clientName || 'No client'}
            {delivery.routeCode ? ` · Route ${delivery.routeCode}` : ''}
            {` · ${delivery.scheduledDate}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={deliveryStatusClassName(delivery.status)}>
            {formatDeliveryStatus(delivery.status)}
          </Badge>
          {delivery.routeReady ? (
            <Button
              type="button"
              variant="outline"
              className={cn(loadedReadyButtonClassName)}
              disabled
              aria-label="Loaded — warehouse load already acknowledged"
              title="Warehouse load is marked loaded and ready"
            >
              <PackageCheck className="size-4 shrink-0" aria-hidden />
              Loaded
            </Button>
          ) : showReady ? (
            <Button
              type="button"
              variant="outline"
              className={cn(markLoadedButtonClassName)}
              aria-label="Mark as Loaded — warehouse load acknowledgment"
              title="Opens the invoice load checklist, then texts the customer and driver"
              onClick={() =>
                setMarkLoadedTarget({
                  driverUid: delivery.driverUid,
                  routeCode: delivery.routeCode,
                  scheduledDate: delivery.scheduledDate,
                })
              }
            >
              <PackageCheck className="size-4 shrink-0" aria-hidden />
              Mark as Loaded
            </Button>
          ) : null}
          {showPlanRoute ? (
            <Button
              type="button"
              variant="outline"
              className={cn(
                delivery.routePlanned ? routePlannedButtonClassName : markLoadedButtonClassName,
              )}
              aria-label={
                delivery.routePlanned
                  ? 'Route planned — click to review or re-plan'
                  : 'Plan route — Google-optimized stop order'
              }
              title={
                delivery.routePlanned
                  ? 'Route order has been planned and saved. Click to review or re-plan.'
                  : 'Opens a proposed stop order from Google Directions'
              }
              onClick={() =>
                setPlanRouteTarget({
                  driverUid: delivery.driverUid,
                  routeCode: delivery.routeCode,
                  scheduledDate: delivery.scheduledDate,
                })
              }
            >
              <Route className="size-4 shrink-0" aria-hidden />
              {delivery.routePlanned ? 'Route planned' : 'Plan route'}
            </Button>
          ) : null}
          {onClose ? (
            <Button type="button" variant="outline" onClick={onClose}>
              Back
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/deliveries">Back</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stop</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <DetailRow label="Address" value={delivery.clientAddress || '—'} />
            <DetailRow label="Contact" value={delivery.contactName || '—'} />
            <DetailRow label="Phone" value={delivery.contactPhone || '—'} />
            <DetailRow label="Invoice No." value={delivery.invoiceNumber || '—'} />
            <DetailRow label="Order" value={delivery.orderNumber || (delivery.orderUid != null ? `#${delivery.orderUid}` : '—')} />
            <DetailRow
              label="Truck"
              value={
                delivery.truckRegistration?.trim() ||
                (delivery.vehicleAssetUid != null ? `Asset #${delivery.vehicleAssetUid}` : '—')
              }
            />
            <DetailRow
              label="Fuel when left"
              value={
                delivery.departureFuelLitres != null
                  ? `${delivery.departureFuelLitres} L`
                  : '—'
              }
            />
            <DetailRow label="Driver" value={delivery.driverName?.trim() || '—'} />
            <DetailRow label="Delivery type" value={formatDeliveryType(delivery.deliveryKind)} />
            <DetailRow label="Invoice weight" value={formatWeightKg(delivery.totalWeightKg)} />
            <DetailRow label="GL code" value={delivery.glCode?.trim() || '—'} />
            <DetailRow label="Client location" value={formatCoordinates(delivery.latitude, delivery.longitude)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proof</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <DetailRow
              label="Loaded"
              value={
                delivery.routeReady
                  ? delivery.routeReadyAt
                    ? `Loaded · ${formatDeliveryTimestamp(delivery.routeReadyAt)}`
                    : 'Loaded (dispatch ready)'
                  : delivery.status === 'cancelled'
                    ? 'Loading cancelled'
                    : 'Not loaded'
              }
            />
            <DetailRow
              label="Credit note passed"
              value={delivery.creditNotePassed ? 'Yes' : 'No'}
            />
            <DetailRow
              label="GRV done"
              value={delivery.grvDone ? 'Yes' : 'No'}
            />
            <DetailRow
              label="Driver pickup"
              value={delivery.routePickupAcknowledged ? 'Signed' : 'Not signed'}
            />
            <DetailRow
              label="Delivery signatures"
              value={
                delivery.steps.signed
                  ? 'Client & driver signed'
                  : delivery.steps.clientSigned || delivery.steps.driverSigned
                    ? 'Partial'
                    : '—'
              }
            />
            <DetailRow label="Exception" value={formatDeliveryException(delivery.exception)} />
            <DetailRow label="Packaging" value={delivery.packagingCondition || '—'} />
            <DetailRow label="Receiver" value={delivery.receiverName || '—'} />
            <DetailRow label="Company" value={delivery.receiverCompany || '—'} />
            <DetailRow label="Position" value={delivery.receiverPosition || '—'} />
            <DetailRow label="Arrived" value={formatDeliveryTimestamp(delivery.arrivalAt)} />
            <DetailRow label="Arrival GPS" value={formatCoordinates(delivery.arrivalLat, delivery.arrivalLng)} />
            <DetailRow label="Submitted" value={formatDeliveryTimestamp(delivery.submittedAt)} />
            <DetailRow label="Submit GPS" value={formatCoordinates(delivery.submitLat, delivery.submitLng)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rating</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {delivery.ratingScore == null ? (
            <p className="text-muted-foreground text-sm">Not rated yet.</p>
          ) : (
            <>
              <DetailRow label="Score" value={`${delivery.ratingScore} / 5`} />
              <DetailRow label="Comment" value={delivery.ratingComment?.trim() || '—'} />
              <DetailRow label="Rated" value={formatDeliveryTimestamp(delivery.ratedAt)} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Invoices ({routeInvoices.length})
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Click an invoice to view its line items.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {routeInvoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invoices linked to this route.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tables.invoice')}</TableHead>
                  <TableHead>{t('tables.client')}</TableHead>
                  <TableHead>Stop</TableHead>
                  <TableHead>{t('tables.status')}</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  {canDispatch ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {routeInvoices.map((inv) => {
                  const invLabel = inv.invoiceNumber || inv.orderNumber || inv.deliveryNumber;
                  const canEditInvoice = canDispatch && canCancelDelivery(inv.status);
                  return (
                    <TableRow
                      key={inv.uid}
                      tabIndex={0}
                      className="cursor-pointer"
                      aria-label={`View items for ${invLabel}`}
                      onClick={() => setSelectedInvoiceUid(inv.uid)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedInvoiceUid(inv.uid);
                        }
                      }}
                    >
                      <TableCell>
                        <span className="flex items-center gap-2 font-medium">
                          <FileText className="size-3.5 shrink-0 text-violet-500" aria-hidden />
                          {invLabel}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {inv.deliveryNumber}
                        </span>
                      </TableCell>
                      <TableCell>{inv.clientName || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {inv.stopSequence != null ? `Stop ${inv.stopSequence}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={deliveryStatusClassName(inv.status)}>
                          {formatDeliveryStatus(inv.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                        {formatWeightKg(inv.totalWeightKg)}
                      </TableCell>
                      {canDispatch ? (
                        <TableCell
                          className="text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {canEditInvoice ? (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 px-2 text-xs"
                                onClick={() => setReassignTarget(inv)}
                              >
                                <ArrowRightLeft className="size-3.5" aria-hidden />
                                Reassign
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={() =>
                                  triggerCancel({
                                    uid: inv.uid,
                                    deliveryNumber: inv.deliveryNumber,
                                    invoiceNumber: inv.invoiceNumber || inv.orderNumber,
                                  })
                                }
                              >
                                <XCircle className="size-3.5" aria-hidden />
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {delivery.status === 'recorded' ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Proof of delivery</CardTitle>
            {pdfUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  Open in new tab
                </a>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {pdfUrl ? (
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs">
                  {delivery.deliveryNumber}.pdf
                  {delivery.receiverName
                    ? ` · Signed by ${delivery.receiverName}${delivery.receiverCompany ? `, ${delivery.receiverCompany}` : ''}`
                    : ''}
                </p>
                <iframe
                  title={`${delivery.deliveryNumber}.pdf`}
                  src={`${pdfUrl}#toolbar=1&navpanes=0`}
                  className="border-border h-[60vh] w-full rounded-md border bg-white"
                />
              </div>
            ) : pdf.isPending ? (
              <div className="border-border flex h-48 items-center justify-center rounded-md border">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                {pdf.isError ? (
                  <p className="text-destructive text-sm">{getQueryErrorMessage(pdf.error)}</p>
                ) : null}
                <Button
                  type="button"
                  className="bg-violet-600 text-white hover:bg-violet-700"
                  disabled={pdf.isPending}
                  onClick={() => void pdf.mutateAsync()}
                  aria-label="Load the ePOD document"
                >
                  <FileText className="size-4" />
                  Load ePOD PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {delivery.status === 'cancelled' && delivery.cancellationReason ? (
        <p className="text-destructive text-sm">
          Cancelled: {formatCancellationReason(delivery.cancellationReason)}
          {delivery.cancellationNote ? ` — ${delivery.cancellationNote}` : ''}
        </p>
      ) : null}

      {showCancel ? (
        <Button
          type="button"
          variant="destructive"
          className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
          onClick={() =>
            triggerCancel({
              uid: delivery.uid,
              deliveryNumber: delivery.deliveryNumber,
              invoiceNumber: delivery.invoiceNumber || delivery.orderNumber,
            })
          }
          aria-label="Cancel this delivery"
        >
          Cancel delivery
        </Button>
      ) : null}
    </div>
  );
}
