'use client';

import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDateRangeLabel } from '../lib/dates';
import {
  formatPerformanceMoney,
  formatPerformancePercent,
  performanceAmountClassName,
  performanceGpPercentClassName,
} from '../lib/format';

interface PerformanceGpCardProps {
  totalGP: number;
  totalRevenue: number;
  currency: string;
  dateRange?: { startDate: string; endDate: string };
}

export function PerformanceGpCard({
  totalGP,
  totalRevenue,
  currency,
  dateRange,
}: PerformanceGpCardProps) {
  const gpPercentage = totalRevenue > 0 ? (totalGP / totalRevenue) * 100 : 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Gross Profit</CardTitle>
          <CardDescription>
            Total profit after costs
            {dateRange ? ` · ${formatDateRangeLabel(dateRange.startDate, dateRange.endDate)}` : ''}
          </CardDescription>
        </div>
        <div
          className={cn(
            'rounded-xl p-2',
            totalGP < 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          )}
        >
          <DollarSign className="size-5" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Total Gross Profit</p>
          <p className={cn('text-2xl', performanceAmountClassName(totalGP))}>
            {formatPerformanceMoney(totalGP, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">GP Margin</p>
          <p className={cn('text-2xl', performanceGpPercentClassName(gpPercentage))}>
            {formatPerformancePercent(gpPercentage)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className={cn('text-2xl', performanceAmountClassName(totalRevenue))}>
            {formatPerformanceMoney(totalRevenue, currency)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
