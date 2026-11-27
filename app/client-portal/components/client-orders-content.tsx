'use client';

import { useMemo, useState } from 'react';
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
import {
  clientPlacedOrders,
  orderMatchesQuery,
  orderTitle,
} from '@/lib/client-order-actions';
import { getQuotationStatusLabel } from '@/lib/order-kanban-utils';
import { QUOTATION_STATUS_OPTIONS } from '@/lib/visit-form-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderActionsMenu } from '@/app/orders/components/order-actions-menu';
import { ClientOrdersKanban } from './client-orders-kanban';

type OrdersView = 'list' | 'board';

export function ClientOrdersContent({ client }: { client: ClientProfileData }) {
  const { t } = useTranslation('portal');
  const [view, setView] = useState<OrdersView>('list');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const orders = useMemo(() => clientPlacedOrders(client.quotations), [client.quotations]);
  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (status !== 'all' && (order.status ?? '').toLowerCase() !== status) return false;
        return orderMatchesQuery(order, search);
      }),
    [orders, search, status]
  );
  const statusOptions = QUOTATION_STATUS_OPTIONS.filter((option) => option.value !== '_none');

  return (
    <div className="space-y-4" data-tour="orders-board">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          placeholder={t('searchOrders')}
          className="sm:max-w-xs"
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder={t('allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 sm:ml-auto">
          <Button
            type="button"
            size="sm"
            variant={view === 'list' ? 'default' : 'outline'}
            onClick={() => setView('list')}
          >
            {t('listView')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === 'board' ? 'default' : 'outline'}
            onClick={() => setView('board')}
          >
            {t('boardView')}
          </Button>
        </div>
      </div>

      {visibleOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <p>{orders.length === 0 ? t('noClientOrders') : t('noOrdersMatch')}</p>
            <Link
              href="/store"
              className="mt-3 inline-block text-primary underline-offset-4 hover:underline"
            >
              {t('placeOrder')}
            </Link>
          </CardContent>
        </Card>
      ) : view === 'board' ? (
        <ClientOrdersKanban quotations={visibleOrders} />
      ) : (
        <ul className="divide-y rounded border bg-card">
          {visibleOrders.map((order) => (
            <li key={order.uid} className="flex items-center gap-3 px-4 py-3">
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
                {formatQuotationStatusLabel(order.status) ||
                  getQuotationStatusLabel(order.status ?? '')}
              </Badge>
              <OrderActionsMenu order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
