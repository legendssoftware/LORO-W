'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronRight, FileText, Package, TrendingUp } from 'lucide-react';
import type { ClientProfileData, ClientQuotation } from '@/api/types/client-portal';
import {
  formatZar,
  parseQuotationAmount,
  quotationStatusClass,
} from '@/lib/client-portal-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QuotationDetailDialog } from './quotation-detail-dialog';

export function ClientOrdersContent({ client }: { client: ClientProfileData }) {
  const [selected, setSelected] = useState<ClientQuotation | null>(null);
  const quotations = (client.quotations ?? []) as ClientQuotation[];
  const orders = useMemo(
    () =>
      quotations.filter(
        (q) =>
          q.isConverted === true ||
          (Array.isArray(q.orders) && q.orders.length > 0)
      ),
    [quotations]
  );

  const totalSpent = orders.reduce(
    (s, q) => s + parseQuotationAmount(q.totalAmount),
    0
  );
  const avgOrder = orders.length > 0 ? totalSpent / orders.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <TrendingUp className="size-8 text-violet-600" />
            <div>
              <p className="text-xs uppercase text-muted-foreground">Total spent</p>
              <p className="text-xl font-semibold">{formatZar(totalSpent)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Package className="size-8 text-violet-600" />
            <div>
              <p className="text-xs uppercase text-muted-foreground">Orders</p>
              <p className="text-xl font-semibold">{orders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <FileText className="size-8 text-violet-600" />
            <div>
              <p className="text-xs uppercase text-muted-foreground">Avg order</p>
              <p className="text-xl font-semibold">{formatZar(avgOrder)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotations & orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {quotations.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No quotations yet. Visit the store to place an order.
            </p>
          ) : (
            quotations.map((q) => (
              <button
                key={q.uid}
                type="button"
                className="w-full flex items-center justify-between rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setSelected(q)}
              >
                <div>
                  <p className="font-medium">
                    {q.quotationNumber ?? q.title ?? `Quotation #${q.uid}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {q.createdAt
                      ? format(new Date(q.createdAt), 'dd MMM yyyy')
                      : '—'}{' '}
                    · {formatZar(parseQuotationAmount(q.totalAmount))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={quotationStatusClass(q.status)}>
                    {(q.status ?? 'pending').replace(/_/g, ' ')}
                  </Badge>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <QuotationDetailDialog
        quotation={selected}
        client={client}
        open={selected != null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
