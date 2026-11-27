'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { ClientProfileData } from '@/api/types/client-portal';
import {
  formatQuotationStatusLabel,
  formatZar,
  parseQuotationAmount,
  quotationStatusClass,
} from '@/lib/client-portal-utils';
import { clientPlacedOrders, orderTitle } from '@/lib/client-order-actions';
import { Badge } from '@/components/ui/badge';
import { OrderActionsMenu } from '@/app/orders/components/order-actions-menu';

/** Latest orders the signed-in client placed from the store. */
export function StoreOrdersStrip({ client }: { client: ClientProfileData }) {
  const { t } = useTranslation('portal');
  const orders = clientPlacedOrders(client.quotations).slice(0, 5);

  return (
    <section className="space-y-3" data-tour="store-orders">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{t('yourOrders')}</h2>
        <Link href="/orders" className="text-sm text-primary underline-offset-4 hover:underline">
          {t('viewAllOrders')}
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="rounded border border-dashed px-4 py-6 text-sm text-muted-foreground">
          {t('noClientOrders')}
        </p>
      ) : (
        <ul className="divide-y rounded border bg-card">
          {orders.map((order) => (
            <li key={order.uid} className="flex items-center gap-2 px-3 py-3">
              <Link href={`/orders/${order.uid}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{orderTitle(order)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.createdAt
                    ? format(new Date(order.createdAt), 'dd MMM yyyy')
                    : '—'}
                  {' · '}
                  {formatZar(parseQuotationAmount(order.totalAmount))}
                </p>
              </Link>
              <Badge className={quotationStatusClass(order.status)}>
                {formatQuotationStatusLabel(order.status)}
              </Badge>
              <OrderActionsMenu order={order} stayOnPage />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
