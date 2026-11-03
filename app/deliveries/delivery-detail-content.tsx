'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  canCancelDelivery,
  useCancelDeliveryMutation,
  useDelivery,
  useDeliveryPdfMutation,
  useSessionSync,
} from '@/api/hooks';
import type { DeliveryDetail, DeliveryMediaKind } from '@/api/types/epod';
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
  deliveryStatusVariant,
  formatCoordinates,
  formatDeliveryException,
  formatDeliveryStatus,
  formatDeliveryTimestamp,
} from '@/app/deliveries/format';

const MEDIA_LABELS: Record<DeliveryMediaKind, string> = {
  goods: 'Goods photo',
  document: 'Receiver document',
  receiver: 'Receiver photo',
  signature: 'Signature',
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function ProofMedia({ delivery }: { delivery: DeliveryDetail }) {
  if (delivery.media.length === 0) {
    return <p className="text-muted-foreground text-sm">No proof images were captured.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {delivery.media.map((item) => (
        <a
          key={item.uid}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border flex flex-col gap-2 rounded-md border p-2 text-sm underline-offset-4 hover:underline"
        >
          {/* Proof images are arbitrary storage URLs, so the plain img tag avoids remote-loader config. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={MEDIA_LABELS[item.kind]}
            className="bg-muted h-32 w-full rounded object-cover"
          />
          <span>{MEDIA_LABELS[item.kind]}</span>
        </a>
      ))}
    </div>
  );
}

export function DeliveryDetailContent({ uid }: { uid: number }) {
  const router = useRouter();
  const query = useDelivery(uid);
  const { backendUserData } = useSessionSync();
  const canDispatch = canDispatchDeliveries(backendUserData?.accessLevel);
  const cancel = useCancelDeliveryMutation(uid);
  const pdf = useDeliveryPdfMutation(uid);

  if (query.isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <p className="text-destructive p-6 text-sm">{getQueryErrorMessage(query.error)}</p>;
  }

  const delivery = query.data;
  const showCancel = canDispatch && canCancelDelivery(delivery.status);
  const pdfUrl = delivery.pdfUrl ?? pdf.data?.url ?? null;

  async function onCancel() {
    await cancel.mutateAsync();
    router.push('/deliveries');
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
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
          <Badge variant={deliveryStatusVariant(delivery.status)}>
            {formatDeliveryStatus(delivery.status)}
          </Badge>
          <Button variant="outline" asChild>
            <Link href="/deliveries">Back</Link>
          </Button>
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
            <DetailRow label="Order" value={delivery.orderNumber || `#${delivery.orderUid}`} />
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
          <CardTitle className="text-base">Captured images</CardTitle>
        </CardHeader>
        <CardContent>
          <ProofMedia delivery={delivery} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {pdfUrl ? (
          <Button asChild>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Open ePOD PDF
            </a>
          </Button>
        ) : delivery.status === 'recorded' ? (
          <Button
            type="button"
            disabled={pdf.isPending}
            onClick={() => void pdf.mutateAsync()}
            aria-label="Generate the ePOD PDF"
          >
            {pdf.isPending ? 'Preparing…' : 'Get ePOD PDF'}
          </Button>
        ) : (
          <p className="text-muted-foreground text-sm">
            The ePOD PDF is available once the driver records this delivery.
          </p>
        )}

        {showCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={cancel.isPending}
            onClick={() => void onCancel()}
            aria-label="Cancel this delivery"
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel delivery'}
          </Button>
        ) : null}
      </div>

      {pdf.isError ? <p className="text-destructive text-sm">{getQueryErrorMessage(pdf.error)}</p> : null}
      {cancel.isError ? <p className="text-destructive text-sm">{getQueryErrorMessage(cancel.error)}</p> : null}
    </div>
  );
}
