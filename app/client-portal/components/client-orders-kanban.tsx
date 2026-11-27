'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { ComponentType } from 'react';
import type { ClientQuotation } from '@/api/types/client-portal';
import { orderTitle } from '@/lib/client-order-actions';
import { OrderActionsMenu } from '@/app/orders/components/order-actions-menu';
import {
  formatZar,
  parseQuotationAmount,
  quotationStatusClass,
} from '@/lib/client-portal-utils';
import {
  CLIENT_ORDER_KANBAN_COLUMNS,
  OTHER_KANBAN_COLUMN,
  groupQuotationsByKanbanColumn,
} from '@/lib/order-kanban-utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type IconComponent = ComponentType<{ className?: string; size?: number }>;

function OrderKanbanCard({ quotation }: { quotation: ClientQuotation }) {
  return (
    <div className="rounded border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/orders/${quotation.uid}`}
          className="min-w-0 flex-1 rounded text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="font-medium text-sm leading-snug line-clamp-2">{orderTitle(quotation)}</p>
        </Link>
        <OrderActionsMenu order={quotation} />
      </div>
      <Link href={`/orders/${quotation.uid}`} className="mt-1 block">
        <p className="text-xs text-muted-foreground">
          {quotation.createdAt
            ? format(new Date(quotation.createdAt), 'dd MMM yyyy')
            : '—'}
        </p>
        <p className="text-sm font-semibold mt-2">
          {formatZar(parseQuotationAmount(quotation.totalAmount))}
        </p>
      </Link>
    </div>
  );
}

function KanbanColumn({
  columnKey,
  label,
  icon: Icon,
  items,
}: {
  columnKey: string;
  label: string;
  icon?: IconComponent;
  items: ClientQuotation[];
}) {
  return (
    <div
      className="flex w-[280px] shrink-0 flex-col rounded border border-border bg-card"
      data-column={columnKey}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
          <h3 className="truncate text-sm font-semibold">{label}</h3>
        </div>
        <Badge
          variant="secondary"
          className={cn('shrink-0 tabular-nums', quotationStatusClass(columnKey))}
        >
          {items.length}
        </Badge>
      </div>
      <div className="flex max-h-[min(520px,60vh)] flex-col gap-2 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No orders
          </p>
        ) : (
          items.map((q) => (
            <OrderKanbanCard key={q.uid} quotation={q} />
          ))
        )}
      </div>
    </div>
  );
}

export function ClientOrdersKanban({
  quotations,
}: {
  quotations: ClientQuotation[];
}) {
  const { t } = useTranslation('portal');
  const grouped = useMemo(
    () => groupQuotationsByKanbanColumn(quotations),
    [quotations]
  );

  const otherItems = grouped.get(OTHER_KANBAN_COLUMN.value) ?? [];

  if (quotations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <p>{t('noClientOrders')}</p>
          <Link href="/store" className="mt-3 inline-block text-primary underline-offset-4 hover:underline">
            {t('placeOrder')}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-h-[420px] gap-4 pb-4">
        {CLIENT_ORDER_KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.value}
            columnKey={col.value}
            label={col.label}
            icon={col.icon}
            items={grouped.get(col.value) ?? []}
          />
        ))}
        <KanbanColumn
          columnKey={OTHER_KANBAN_COLUMN.value}
          label={OTHER_KANBAN_COLUMN.label}
          items={otherItems}
        />
      </div>
    </div>
  );
}
