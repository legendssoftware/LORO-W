'use client';

import {
  ReportProgressBar,
  getProgressColorClasses,
} from '@/app/staff/components/report-progress-bar';
import { cn } from '@/lib/utils';

interface ReportsHoursTargetCardProps {
  workedHours: number;
  targetHours: number;
  progress: number;
  className?: string;
}

/**
 * Org hours worked vs expected (staff card pattern) for Attendance section.
 */
export function ReportsHoursTargetCard({
  workedHours,
  targetHours,
  progress,
  className,
}: ReportsHoursTargetCardProps) {
  const pctClass = getProgressColorClasses(progress);
  const worked = Math.round(workedHours * 10) / 10;
  const target = Math.round(targetHours);

  return (
    <div
      className={cn(
        'flex h-[224px] flex-col justify-center gap-4 px-1',
        className
      )}
    >
      <div className="space-y-1 text-center">
        <p className="text-3xl font-semibold tabular-nums text-foreground">
          {worked}
          <span className="text-lg font-normal text-muted-foreground">
            /{target}h
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Hours worked vs expected for range
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <ReportProgressBar value={progress} />
        </div>
        <span
          className={cn(
            'shrink-0 text-sm font-medium tabular-nums',
            pctClass.text
          )}
        >
          {progress}%
        </span>
      </div>
    </div>
  );
}
