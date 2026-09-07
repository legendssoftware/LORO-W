'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { ReportsSalesTargetRadialChart } from '@/app/reports/components/reports-sales-target-radial-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateRangeLabel } from '../lib/dates';
import { formatPerformanceMoney } from '../lib/format';

interface PerformanceTargetCardProps {
  achieved: number;
  target: number;
  currency: string;
  dateRange?: { startDate: string; endDate: string };
  footerCountries?: string[];
}

export function PerformanceTargetCard({
  achieved,
  target,
  currency,
  dateRange,
  footerCountries,
}: PerformanceTargetCardProps) {
  const remaining = Math.max(0, target - achieved);
  const isOver = achieved > target;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue Target</CardTitle>
        <CardDescription>
          Track your performance towards goals
          {dateRange ? ` · ${formatDateRangeLabel(dateRange.startDate, dateRange.endDate)}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <ReportsSalesTargetRadialChart target={target} achieved={achieved} />
          <div className="flex flex-col justify-center gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Achieved</p>
              <p className="text-xl font-semibold">{formatPerformanceMoney(achieved, currency)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target</p>
              <p className="text-xl font-semibold">{formatPerformanceMoney(target, currency)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {isOver ? (
                <TrendingUp className="size-4 text-emerald-600" />
              ) : (
                <TrendingDown className="size-4 text-muted-foreground" />
              )}
              <span>
                {isOver ? 'Above target by' : 'Remaining'}{' '}
                {formatPerformanceMoney(isOver ? achieved - target : remaining, currency)}
              </span>
            </div>
          </div>
        </div>
        {footerCountries && footerCountries.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Total for all countries: {footerCountries.join(', ')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
