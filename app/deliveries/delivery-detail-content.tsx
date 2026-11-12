'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, FileText } from 'lucide-react';
import {
  canCancelDelivery,
  useCancelDeliveryMutation,
  useDelivery,
  useDeliveryPdfMutation,
  useSessionSync,
} from '@/api/hooks';
import { canDispatchDeliveries } from '@/lib/access';
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
import {
  deliveryStatusClassName,
  formatCoordinates,
  formatDeliveryException,
  formatDeliveryStatus,
  formatDeliveryTimestamp,
} from '@/app/deliveries/format';

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
}: {
  uid: number;
  /** When set, Back and a successful cancel close the host dialog instead of leaving the page. */
  onClose?: () => void;
}) {
  const router = useRouter();
  const embedded = onClose != null;
  const query = useDelivery(uid);
  const { backendUserData } = useSessionSync();
  const canDispatch = canDispatchDeliveries(backendUserData);
  const cancel = useCancelDeliveryMutation(uid);
  const pdf = useDeliveryPdfMutation(uid);

  if (query.isLoading) {
    return (
      <div className={embedded ? undefined : 'p-6'}>
        <LoadingSpinner />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <p className={embedded ? 'text-destructive text-sm' : 'text-destructive p-6 text-sm'}>
        {getQueryErrorMessage(query.error)}
      </p>
    );
  }

  const delivery = query.data;
  const showCancel = canDispatch && canCancelDelivery(delivery.status);
  const pdfUrl = delivery.pdfUrl ?? pdf.data?.url ?? null;

  async function onCancel() {
    await cancel.mutateAsync();
    if (onClose) {
      onClose();
      return;
    }
    router.push('/deliveries');
  }

  return (
    <div className={embedded ? 'flex flex-col gap-6' : 'flex flex-col gap-6 p-4 md:p-6'}>
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
            <DetailRow label="Order" value={delivery.orderNumber || (delivery.orderUid != null ? `#${delivery.orderUid}` : '—')} />
            <DetailRow label="Client location" value={formatCoordinates(delivery.latitude, delivery.longitude)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proof</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
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
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          {delivery.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">This delivery has no lines.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delivery.items.map((item) => (
                  <TableRow key={item.uid}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.orderedQty}</TableCell>
                    <TableCell className="text-right">
                      {item.deliveredQty}
                      {item.deliveredQty < item.orderedQty ? (
                        <span className="text-destructive ml-2 text-xs">Short</span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proof of delivery</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="border-border flex flex-col items-center gap-2 rounded-md border p-6 text-center">
            <FileText className="text-violet-500" size={40} strokeWidth={1.5} />
            <p className="text-sm">{delivery.deliveryNumber}.pdf</p>
            <p className="text-muted-foreground text-xs">
              {delivery.receiverName
                ? `Signed by ${delivery.receiverName}${delivery.receiverCompany ? `, ${delivery.receiverCompany}` : ''}`
                : 'Signed proof of delivery'}
            </p>
          </div>

          {delivery.status !== 'recorded' ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              The ePOD document is available once the driver records this delivery.
            </p>
          ) : pdf.isPending ? (
            <p className="text-muted-foreground text-sm">Preparing the document…</p>
          ) : pdf.isError && !pdfUrl ? (
            <p className="text-destructive text-sm">{getQueryErrorMessage(pdf.error)}</p>
          ) : null}

          {pdfUrl ? (
            <Button asChild className="bg-violet-600 text-white hover:bg-violet-700">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Open document
              </a>
            </Button>
          ) : delivery.status === 'recorded' ? (
            <Button
              type="button"
              className="bg-violet-600 text-white hover:bg-violet-700"
              disabled={pdf.isPending}
              onClick={() => void pdf.mutateAsync()}
              aria-label="Open the ePOD document"
            >
              <ExternalLink className="size-4" />
              {pdf.isPending ? 'Preparing…' : 'Open document'}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {showCancel ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={cancel.isPending}
            onClick={() => void onCancel()}
            aria-label="Cancel this delivery"
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel delivery'}
          </Button>
        </div>
      ) : null}

      {cancel.isError ? <p className="text-destructive text-sm">{getQueryErrorMessage(cancel.error)}</p> : null}
    </div>
  );
}
