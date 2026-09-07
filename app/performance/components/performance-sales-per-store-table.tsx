'use client';

import { Fragment, useMemo, useState } from 'react';
import type { PerformanceDashboardData } from '@/api/types/reports-performance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getCountryFlag } from '@/lib/utils/country-flags';
import { PERFORMANCE_COUNTRY_ORDER } from '../lib/constants';
import { cn } from '@/lib/utils';
import {
  formatPerformanceInteger,
  formatPerformanceMoney,
  formatPerformancePercent,
  performanceAmountClassName,
  performanceGpPercentClassName,
} from '../lib/format';

type SortField = 'revenue' | 'transactions' | 'clients' | 'basketValue' | 'gp' | 'gpPercentage';

interface PerformanceSalesPerStoreTableProps {
  dashboardData?: PerformanceDashboardData | null;
}

export function PerformanceSalesPerStoreTable({
  dashboardData,
}: PerformanceSalesPerStoreTableProps) {
  const [sortBy, setSortBy] = useState<SortField>('revenue');
  const currency = dashboardData?.currency?.symbol || 'R';

  const storeData = useMemo(() => {
    const rows = (dashboardData?.salesPerStore ?? []).map((store) => ({
      ...store,
      countryCode: (store.countryCode || 'SA').toUpperCase(),
    }));
    rows.sort((a, b) => {
      const map: Record<SortField, number> = {
        revenue: a.totalRevenue - b.totalRevenue,
        transactions: a.transactionCount - b.transactionCount,
        clients: a.uniqueClients - b.uniqueClients,
        basketValue: a.averageTransactionValue - b.averageTransactionValue,
        gp: a.grossProfit - b.grossProfit,
        gpPercentage: a.grossProfitPercentage - b.grossProfitPercentage,
      };
      return -map[sortBy];
    });
    return rows;
  }, [dashboardData, sortBy]);

  const totals = useMemo(() => {
    const revenue = storeData.reduce((s, r) => s + r.totalRevenue, 0);
    const gp = storeData.reduce((s, r) => s + r.grossProfit, 0);
    const transactions = storeData.reduce((s, r) => s + r.transactionCount, 0);
    const clients =
      dashboardData?.totalUniqueClients ?? storeData.reduce((s, r) => s + r.uniqueClients, 0);
    return {
      revenue,
      gp,
      transactions,
      clients,
      gpPercentage: revenue > 0 ? (gp / revenue) * 100 : 0,
      avgBasket: transactions > 0 ? revenue / transactions : 0,
    };
  }, [storeData, dashboardData?.totalUniqueClients]);

  const grouped = useMemo(() => {
    const byCountry = new Map<string, typeof storeData>();
    for (const store of storeData) {
      const code = store.countryCode || 'SA';
      const list = byCountry.get(code) ?? [];
      list.push(store);
      byCountry.set(code, list);
    }
    const ordered = PERFORMANCE_COUNTRY_ORDER.filter((c) => byCountry.has(c));
    const extra = Array.from(byCountry.keys()).filter(
      (c) => !PERFORMANCE_COUNTRY_ORDER.includes(c as (typeof PERFORMANCE_COUNTRY_ORDER)[number])
    );
    return [...ordered, ...extra].map((code) => ({
      countryCode: code,
      stores: byCountry.get(code) ?? [],
    }));
  }, [storeData]);

  if (storeData.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Sales per store</CardTitle>
        <select
          className="rounded-md border bg-background px-2 py-1 text-xs"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortField)}
        >
          <option value="revenue">Revenue</option>
          <option value="gp">Gross profit</option>
          <option value="gpPercentage">GP %</option>
          <option value="transactions">Transactions</option>
          <option value="clients">Clients</option>
          <option value="basketValue">Avg basket</option>
        </select>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
              <TableHead className="text-right">Clients</TableHead>
              <TableHead className="text-right">Avg basket</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">GP</TableHead>
              <TableHead className="text-right">GP %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map((group) => (
              <Fragment key={group.countryCode}>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={7} className="font-medium">
                    {getCountryFlag(group.countryCode).flag} {getCountryFlag(group.countryCode).name}
                  </TableCell>
                </TableRow>
                {group.stores.map((store) => (
                  <TableRow key={store.storeId || store.storeName}>
                    <TableCell className="font-medium">{store.storeName}</TableCell>
                    <TableCell className="text-right">{formatPerformanceInteger(store.transactionCount)}</TableCell>
                    <TableCell className="text-right">{formatPerformanceInteger(store.uniqueClients)}</TableCell>
                    <TableCell
                      className={cn('text-right', performanceAmountClassName(store.averageTransactionValue))}
                    >
                      {formatPerformanceMoney(store.averageTransactionValue, currency)}
                    </TableCell>
                    <TableCell className={cn('text-right', performanceAmountClassName(store.totalRevenue))}>
                      {formatPerformanceMoney(store.totalRevenue, currency)}
                    </TableCell>
                    <TableCell className={cn('text-right', performanceAmountClassName(store.grossProfit))}>
                      {formatPerformanceMoney(store.grossProfit, currency)}
                    </TableCell>
                    <TableCell
                      className={cn('text-right', performanceGpPercentClassName(store.grossProfitPercentage))}
                    >
                      {formatPerformancePercent(store.grossProfitPercentage)}
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{formatPerformanceInteger(totals.transactions)}</TableCell>
              <TableCell className="text-right">{formatPerformanceInteger(totals.clients)}</TableCell>
              <TableCell className={cn('text-right', performanceAmountClassName(totals.avgBasket))}>
                {formatPerformanceMoney(totals.avgBasket, currency)}
              </TableCell>
              <TableCell className={cn('text-right', performanceAmountClassName(totals.revenue))}>
                {formatPerformanceMoney(totals.revenue, currency)}
              </TableCell>
              <TableCell className={cn('text-right', performanceAmountClassName(totals.gp))}>
                {formatPerformanceMoney(totals.gp, currency)}
              </TableCell>
              <TableCell className={cn('text-right', performanceGpPercentClassName(totals.gpPercentage))}>
                {formatPerformancePercent(totals.gpPercentage)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
