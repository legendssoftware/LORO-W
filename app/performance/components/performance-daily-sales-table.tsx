'use client';

import { useMemo } from 'react';
import type {
  PerformanceDashboardData,
  PerformanceFilters,
} from '@/api/types/reports-performance';
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
import { cn } from '@/lib/utils';
import {
  formatPerformanceInteger,
  formatPerformanceMoney,
  formatPerformancePercent,
  performanceAmountClassName,
  performanceGpPercentClassName,
} from '../lib/format';
import { useTranslation } from 'react-i18next';

interface PerformanceDailySalesTableProps {
  dashboardData?: PerformanceDashboardData | null;
  filters?: PerformanceFilters;
}

export function PerformanceDailySalesTable({
  dashboardData,
}: PerformanceDailySalesTableProps) {
  const { t } = useTranslation('screens');
  const currency = dashboardData?.currency?.symbol || 'R';
  const days = dashboardData?.dailySalesPerformance ?? [];
  const unassigned = dashboardData?.unassignedSales ?? [];

  const totals = useMemo(() => {
    const sales = days.reduce((s, d) => s + d.salesR, 0);
    const gp = days.reduce((s, d) => s + d.gpR, 0);
    const baskets = days.reduce((s, d) => s + d.basketCount, 0);
    const clients =
      dashboardData?.totalUniqueClients ?? days.reduce((s, d) => s + d.clientsQty, 0);
    return {
      sales,
      gp,
      baskets,
      clients,
      gpPercentage: sales > 0 ? (gp / sales) * 100 : 0,
      basketValue: baskets > 0 ? sales / baskets : 0,
    };
  }, [days, dashboardData?.totalUniqueClients]);

  if (days.length === 0 && unassigned.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{t('chrome.performance.daily.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 overflow-x-auto">
        {days.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tables.date')}</TableHead>
                <TableHead>{t('tables.day')}</TableHead>
                <TableHead className="text-right">{t('tables.baskets')}</TableHead>
                <TableHead className="text-right">{t('tables.client')}</TableHead>
                <TableHead className="text-right">{t('tables.basketValue')}</TableHead>
                <TableHead className="text-right">{t('tables.sales')}</TableHead>
                <TableHead className="text-right">{t('tables.gp')}</TableHead>
                <TableHead className="text-right">{t('tables.gpPercent')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((day) => (
                <TableRow key={day.date || day.dayOfWeek}>
                  <TableCell className="font-medium">{day.date}</TableCell>
                  <TableCell>{day.dayOfWeek}</TableCell>
                  <TableCell className="text-right">{formatPerformanceInteger(day.basketCount)}</TableCell>
                  <TableCell className="text-right">{formatPerformanceInteger(day.clientsQty)}</TableCell>
                  <TableCell className={cn('text-right', performanceAmountClassName(day.basketValue))}>
                    {formatPerformanceMoney(day.basketValue, currency)}
                  </TableCell>
                  <TableCell className={cn('text-right', performanceAmountClassName(day.salesR))}>
                    {formatPerformanceMoney(day.salesR, currency)}
                  </TableCell>
                  <TableCell className={cn('text-right', performanceAmountClassName(day.gpR))}>
                    {formatPerformanceMoney(day.gpR, currency)}
                  </TableCell>
                  <TableCell className={cn('text-right', performanceGpPercentClassName(day.gpPercentage))}>
                    {formatPerformancePercent(day.gpPercentage)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>{t('tables.total')}</TableCell>
                <TableCell className="text-right">{formatPerformanceInteger(totals.baskets)}</TableCell>
                <TableCell className="text-right">{formatPerformanceInteger(totals.clients)}</TableCell>
                <TableCell className={cn('text-right', performanceAmountClassName(totals.basketValue))}>
                  {formatPerformanceMoney(totals.basketValue, currency)}
                </TableCell>
                <TableCell className={cn('text-right', performanceAmountClassName(totals.sales))}>
                  {formatPerformanceMoney(totals.sales, currency)}
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
        ) : null}

        {unassigned.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-medium">{t('chrome.performance.daily.unassigned')}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tables.doc')}</TableHead>
                  <TableHead>{t('tables.date')}</TableHead>
                  <TableHead>{t('tables.store')}</TableHead>
                  <TableHead>{t('tables.country')}</TableHead>
                  <TableHead className="text-right">{t('tables.lines')}</TableHead>
                  <TableHead className="text-right">{t('tables.amountExcl')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassigned.map((row) => (
                  <TableRow key={`${row.docNumber}-${row.saleDate}-${row.storeCode}`}>
                    <TableCell className="font-medium">{row.docNumber}</TableCell>
                    <TableCell>{row.saleDate}</TableCell>
                    <TableCell>{row.branchName || row.storeCode}</TableCell>
                    <TableCell>
                      {row.sourceCountryCode
                        ? `${getCountryFlag(row.sourceCountryCode).flag} ${row.sourceCountryCode}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">{formatPerformanceInteger(row.lineCount)}</TableCell>
                    <TableCell className={cn('text-right', performanceAmountClassName(row.amountExclTax))}>
                      {formatPerformanceMoney(row.amountExclTax, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
