'use client';

import { Fragment, useMemo } from 'react';
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

interface PerformanceBranchCategoryTableProps {
  dashboardData?: PerformanceDashboardData | null;
}

function uniqueCategories(
  rows: NonNullable<PerformanceDashboardData['branchCategoryPerformance']>
): string[] {
  const names = new Set<string>();
  for (const branch of rows) {
    for (const cat of Object.values(branch.categories ?? {})) {
      if (cat?.categoryName) names.add(cat.categoryName);
    }
  }
  return Array.from(names).sort();
}

export function PerformanceBranchCategoryTable({
  dashboardData,
}: PerformanceBranchCategoryTableProps) {
  const currency = dashboardData?.currency?.symbol || 'R';
  const branches = dashboardData?.branchCategoryPerformance ?? [];
  const categories = useMemo(() => uniqueCategories(branches), [branches]);

  const grouped = useMemo(() => {
    const byCountry = new Map<string, typeof branches>();
    for (const branch of branches) {
      const code = (branch.countryCode || 'SA').toUpperCase();
      const list = byCountry.get(code) ?? [];
      list.push(branch);
      byCountry.set(code, list);
    }
    const ordered = PERFORMANCE_COUNTRY_ORDER.filter((c) => byCountry.has(c));
    const extra = Array.from(byCountry.keys()).filter(
      (c) => !PERFORMANCE_COUNTRY_ORDER.includes(c as (typeof PERFORMANCE_COUNTRY_ORDER)[number])
    );
    return [...ordered, ...extra].map((code) => ({
      countryCode: code,
      branches: byCountry.get(code) ?? [],
    }));
  }, [branches]);

  const totals = useMemo(() => {
    const sales = branches.reduce((s, b) => s + b.total.salesR, 0);
    const gp = branches.reduce((s, b) => s + (b.total.gpR || 0), 0);
    const baskets = dashboardData?.totalDistinctInvoices
      ?? branches.reduce((s, b) => s + b.total.basketCount, 0);
    const clients =
      dashboardData?.totalUniqueClients ?? branches.reduce((s, b) => s + (b.total.clientsQty ?? 0), 0);
    return {
      sales,
      gp,
      baskets,
      clients,
      gpPercentage: sales > 0 ? (gp / sales) * 100 : 0,
    };
  }, [branches, dashboardData?.totalDistinctInvoices, dashboardData?.totalUniqueClients]);

  if (branches.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">
          Branch × category performance
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch</TableHead>
              {categories.map((cat) => (
                <TableHead key={cat} className="text-right">
                  {cat}
                </TableHead>
              ))}
              <TableHead className="text-right">Baskets</TableHead>
              <TableHead className="text-right">Clients</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">GP</TableHead>
              <TableHead className="text-right">GP %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map((group) => (
              <Fragment key={group.countryCode}>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={categories.length + 6} className="font-medium">
                    {getCountryFlag(group.countryCode).flag} {getCountryFlag(group.countryCode).name}
                  </TableCell>
                </TableRow>
                {group.branches.map((branch) => (
                  <TableRow key={branch.branchId || branch.branchName}>
                    <TableCell className="font-medium">{branch.branchName}</TableCell>
                    {categories.map((cat) => {
                      const match = Object.values(branch.categories ?? {}).find(
                        (c) => c.categoryName === cat
                      );
                      return (
                        <TableCell
                          key={cat}
                          className={cn(
                            'text-right',
                            match ? performanceAmountClassName(match.salesR) : undefined
                          )}
                        >
                          {match ? formatPerformanceMoney(match.salesR, currency) : '—'}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">
                      {formatPerformanceInteger(branch.total.basketCount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPerformanceInteger(branch.total.clientsQty)}
                    </TableCell>
                    <TableCell className={cn('text-right', performanceAmountClassName(branch.total.salesR))}>
                      {formatPerformanceMoney(branch.total.salesR, currency)}
                    </TableCell>
                    <TableCell className={cn('text-right', performanceAmountClassName(branch.total.gpR))}>
                      {formatPerformanceMoney(branch.total.gpR, currency)}
                    </TableCell>
                    <TableCell
                      className={cn('text-right', performanceGpPercentClassName(branch.total.gpPercentage))}
                    >
                      {formatPerformancePercent(branch.total.gpPercentage)}
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total ({branches.length} branches)</TableCell>
              {categories.map((cat) => (
                <TableCell key={cat} />
              ))}
              <TableCell className="text-right">{formatPerformanceInteger(totals.baskets)}</TableCell>
              <TableCell className="text-right">{formatPerformanceInteger(totals.clients)}</TableCell>
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
      </CardContent>
    </Card>
  );
}
