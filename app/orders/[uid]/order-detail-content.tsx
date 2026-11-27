'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useSessionSync } from '@/api/hooks';
import { isClientMode } from '@/lib/user-mode';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { ClientPortalLoading } from '@/app/client-portal/components/client-portal-loading';
import type { ClientProfileData, ClientQuotation } from '@/api/types/client-portal';
import {
  canClientCancelOrder,
  canClientEditOrder,
  orderTitle,
} from '@/lib/client-order-actions';
import { Button } from '@/components/ui/button';
import { CancelOrderDialog } from '@/app/orders/components/cancel-order-dialog';
import { OrderDetailBody } from '@/app/orders/components/order-detail-body';
import { OrderEditForm } from '@/app/orders/components/order-edit-form';
import { useReorderOrder } from '@/app/orders/components/use-reorder-order';

function OrderDetail({
  client,
  order,
}: {
  client: ClientProfileData;
  order: ClientQuotation;
}) {
  const { t } = useTranslation('portal');
  const router = useRouter();
  const searchParams = useSearchParams();
  const reorder = useReorderOrder();
  const [editingOverride, setEditingOverride] = useState<boolean | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const canEdit = canClientEditOrder(order.status);
  const canCancel = canClientCancelOrder(order.status);
  const editRequested = searchParams.get('edit') === '1';
  const editing = canEdit && (editingOverride ?? editRequested);

  function stopEditing() {
    setEditingOverride(false);
    if (editRequested) router.replace(`/orders/${order.uid}`);
  }

  return (
    <div className={appPageScrollWrapClass}>
      <main className={appPageMainClass}>
        <div className="mb-6 flex flex-col gap-4">
          <Link
            href="/orders"
            className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t('backToOrders')}
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              {orderTitle(order)}
            </h1>
            <div className="flex flex-wrap gap-2">
              {canEdit && !editing ? (
                <Button type="button" variant="outline" onClick={() => setEditingOverride(true)}>
                  {t('editOrder')}
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => reorder(order)}>
                {t('reorder')}
              </Button>
              {order.pdfURL ? (
                <Button type="button" variant="outline" asChild>
                  <a href={String(order.pdfURL)} target="_blank" rel="noopener noreferrer">
                    {t('openPdf')}
                  </a>
                </Button>
              ) : null}
              {canCancel ? (
                <Button type="button" variant="cancel" onClick={() => setCancelOpen(true)}>
                  {t('cancelOrder')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {editing && canEdit ? (
          <OrderEditForm
            key={`${order.uid}-${order.updatedAt ?? ''}`}
            order={order}
            clientUid={client.uid}
            onCancel={stopEditing}
            onSaved={stopEditing}
          />
        ) : (
          <OrderDetailBody quotation={order} client={client} />
        )}
      </main>
      <CancelOrderDialog order={order} open={cancelOpen} onOpenChange={setCancelOpen} />
    </div>
  );
}

export function OrderDetailContent() {
  const { t: portal } = useTranslation('portal');
  const params = useParams();
  const { backendUserData: profile } = useSessionSync();
  const uid = Number(params.uid);

  if (!isClientMode(profile)) {
    return (
      <main className={appPageMainClass}>
        <p className="text-muted-foreground">{portal('ordersClientOnly')}</p>
      </main>
    );
  }

  return (
    <ClientPortalLoading>
      {(client) => {
        const order = (client.quotations ?? []).find((quotation) => quotation.uid === uid);
        if (!order || !Number.isFinite(uid)) {
          return (
            <main className={appPageMainClass}>
              <p className="text-muted-foreground">{portal('orderNotFound')}</p>
              <Link
                href="/orders"
                className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline"
              >
                {portal('backToOrders')}
              </Link>
            </main>
          );
        }
        return <OrderDetail client={client} order={order} />;
      }}
    </ClientPortalLoading>
  );
}
