'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import type { ComponentType } from 'react';
import type { ClientQuotation } from '@/api/types/client-portal';
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

function OrderKanbanCard({
  quotation,
  onSelect,
}: {
  quotation: ClientQuotation;
  onSelect: (q: ClientQuotation) => void;
}) {
  const title =
    quotation.quotationNumber ??
    quotation.orderNumber ??
    quotation.title ??
    `Quotation #${quotation.uid}`;

  return (
    <button
      type="button"
      className={cn(
        'w-full rounded border bg-card p-3 text-left transition-colors',
        'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      onClick={() => onSelect(quotation)}
    >
      <p className="font-medium text-sm leading-snug line-clamp-2">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {quotation.createdAt
          ? format(new Date(quotation.createdAt), 'dd MMM yyyy')
          : '—'}
      </p>
      <p className="text-sm font-semibold mt-2">
        {formatZar(parseQuotationAmount(quotation.totalAmount))}
      </p>
      {quotation.isClientPlaced && (
        <Badge variant="outline" className="mt-2 text-xs">
          Client placed
        </Badge>
      )}
    </button>
  );
}

function KanbanColumn({
  columnKey,
  label,
  icon: Icon,
  items,
  onSelect,
}: {
  columnKey: string;
  label: string;
  icon?: IconComponent;
  items: ClientQuotation[];
  onSelect: (q: ClientQuotation) => void;
}) {
  return (
    <div
      className="flex w-[280px] shrink-0 flex-col rounded border bg-white"
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
            <OrderKanbanCard key={q.uid} quotation={q} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}

export function ClientOrdersKanban({
  quotations,
  onSelect,
}: {
  quotations: ClientQuotation[];
  onSelect: (q: ClientQuotation) => void;
}) {
  const grouped = useMemo(
    () => groupQuotationsByKanbanColumn(quotations),
    [quotations]
  );

  const otherItems = grouped.get(OTHER_KANBAN_COLUMN.value) ?? [];

  if (quotations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No quotations yet. Visit the store to place an order.
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
            onSelect={onSelect}
          />
        ))}
        <KanbanColumn
          columnKey={OTHER_KANBAN_COLUMN.value}
          label={OTHER_KANBAN_COLUMN.label}
          items={otherItems}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
