'use client';

import {
  ReportProgressBar,
  getProgressColorClasses,
} from '@/app/staff/components/report-progress-bar';
import { formatReportMoney } from '@/app/reports/lib/reports-chart-format';
import type { UserSalesTargetBar } from '@/app/reports/lib/reports-dashboard-chart-helpers';
import { cn } from '@/lib/utils';

interface ReportsUserTargetBarsProps {
  rows: UserSalesTargetBar[];
  className?: string;
}

/**
 * Per-user revenue vs sales target with staff-style % progress bar.
 */
export function ReportsUserTargetBars({
  rows,
  className,
}: ReportsUserTargetBarsProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
    );
  }

  return (
    <ul className={cn('flex flex-col gap-3', className)}>
      {rows.map((row) => {
        const pctClass = getProgressColorClasses(row.progress);
        return (
          <li key={row.name} className="min-w-0 space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate font-medium text-foreground">
                {row.name}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatReportMoney(row.revenue)}
                {row.target > 0 ? (
                  <>
                    <span className="mx-0.5">/</span>
                    {formatReportMoney(row.target)}
                  </>
                ) : null}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <ReportProgressBar value={row.progress} />
              </div>
              <span
                className={cn(
                  'shrink-0 text-xs font-medium tabular-nums',
                  pctClass.text
                )}
              >
                {row.progress}%
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
