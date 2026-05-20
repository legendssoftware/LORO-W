'use client';

import { useMemo } from 'react';
import { DollarSign, FileText, Package, TrendingUp, User } from 'lucide-react';
import type { ClientProfileData, ClientQuotation } from '@/api/types/client-portal';
import { formatZar, getSalesRepName, parseQuotationAmount } from '@/lib/client-portal-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ReportDonutChart,
  type ReportDonutSlice,
} from '@/components/charts/report-donut-chart';
import type { ChartConfig } from '@/components/ui/chart';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function ClientReportsSalesTab({ client }: { client: ClientProfileData }) {
  const quotations = (client.quotations ?? []) as ClientQuotation[];
  const orders = quotations.filter(
    (q) =>
      q.isConverted === true ||
      (Array.isArray(q.orders) && q.orders.length > 0)
  );

  const totalSales = useMemo(
    () => quotations.reduce((s, q) => s + parseQuotationAmount(q.totalAmount), 0),
    [quotations]
  );
  const orderTotal = useMemo(
    () => orders.reduce((s, q) => s + parseQuotationAmount(q.totalAmount), 0),
    [orders]
  );
  const avgOrder = orders.length > 0 ? orderTotal / orders.length : 0;

  const statusDonut = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of quotations) {
      const key = (q.status ?? 'Unknown').replace(/_/g, ' ');
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const entries = [...map.entries()];
    const config: ChartConfig = {};
    const slices: ReportDonutSlice[] = entries.map(([label, value], i) => {
      const id = label.toLowerCase().replace(/\s+/g, '-');
      config[id] = { label, color: CHART_COLORS[i % CHART_COLORS.length] };
      return {
        id,
        label,
        value,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    const sum = slices.reduce((s, x) => s + x.value, 0);
    return { config, slices, sum };
  }, [quotations]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={TrendingUp} label="Total sales" value={formatZar(totalSales)} />
        <MetricCard icon={Package} label="Orders" value={String(orders.length)} />
        <MetricCard icon={FileText} label="Quotations" value={String(quotations.length)} />
        <MetricCard icon={DollarSign} label="Avg order" value={formatZar(avgOrder)} />
      </div>

      {statusDonut.slices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order status</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportDonutChart
              config={statusDonut.config}
              data={statusDonut.slices}
              centerPrimary={String(statusDonut.sum)}
              centerSecondary="Quotations"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-5" />
            Assigned sales representative
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>{getSalesRepName(client)}</p>
          {client.assignedSalesRep?.email && (
            <p className="text-muted-foreground">{client.assignedSalesRep.email}</p>
          )}
          {client.assignedSalesRep?.phone && (
            <p className="text-muted-foreground">{client.assignedSalesRep.phone}</p>
          )}
          <p className="pt-2">
            <span className="text-muted-foreground">Payment terms: </span>
            {client.paymentTerms ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Credit limit: </span>
            {formatZar(client.creditLimit)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Icon className="size-5 text-violet-600 mb-2" />
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
