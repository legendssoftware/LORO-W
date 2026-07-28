'use client';

import { cn } from '@/lib/utils';
import {
  ReportProgressBar,
  getProgressColorClasses,
} from '@/app/staff/components/report-progress-bar';

export interface ReportsAttendanceHoursBuckets {
  today?: number | null;
  thisWeek?: number | null;
  thisMonth: number;
  payrollHours: number;
}

export interface ReportsAttendanceMetricsPanelProps {
  payrollLabel: string;
  monthLabel: string;
  hours: ReportsAttendanceHoursBuckets;
  payrollTargetHours: number;
  monthTargetHours: number;
  attendanceRate: number | null;
  punctualityScore: number | null;
  averageCheckIn: string | null;
  averageCheckOut: string | null;
  showLiveBuckets?: boolean;
  className?: string;
}

function MetricTile({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-h-[88px] flex-col justify-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-center">
      <p
        className={cn(
          'text-2xl font-semibold tabular-nums text-foreground',
          valueClassName
        )}
      >
        {value}
      </p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {hint ? (
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function HoursProgressTile({
  title,
  subtitle,
  workedHours,
  targetHours,
}: {
  title: string;
  subtitle: string;
  workedHours: number;
  targetHours: number;
}) {
  const progress =
    targetHours > 0
      ? Math.min(100, Math.round((workedHours / targetHours) * 100))
      : 0;
  const pctClass = getProgressColorClasses(progress);
  const worked = Math.round(workedHours * 10) / 10;
  const target = Math.round(targetHours);

  return (
    <div className="flex min-h-[140px] flex-col justify-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-4">
      <div className="space-y-0.5 text-center">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {worked}
          <span className="text-base font-normal text-muted-foreground">
            /{target}h
          </span>
        </p>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
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

function formatHours(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}h`;
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value)}%`;
}

function formatTime(value: string | null | undefined): string {
  if (!value || value === 'N/A') return '—';
  return value;
}

/**
 * Attendance snapshot for reports Overview — payroll + MTD hours, ACR,
 * avg check-in/out, and optional live hour buckets (APK profile parity).
 */
export function ReportsAttendanceMetricsPanel({
  payrollLabel,
  monthLabel,
  hours,
  payrollTargetHours,
  monthTargetHours,
  attendanceRate,
  punctualityScore,
  averageCheckIn,
  averageCheckOut,
  showLiveBuckets = false,
  className,
}: ReportsAttendanceMetricsPanelProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HoursProgressTile
          title="Payroll period"
          subtitle={payrollLabel}
          workedHours={hours.payrollHours}
          targetHours={payrollTargetHours}
        />
        <HoursProgressTile
          title="Month to date"
          subtitle={monthLabel}
          workedHours={hours.thisMonth}
          targetHours={monthTargetHours}
        />
        <MetricTile
          label="Attendance rate"
          value={formatPct(attendanceRate)}
          hint="ACR for selected range"
          valueClassName={
            attendanceRate != null && attendanceRate >= 85
              ? 'text-emerald-600 dark:text-emerald-400'
              : undefined
          }
        />
        <MetricTile
          label="Punctuality"
          value={formatPct(punctualityScore)}
          hint="On-time arrivals"
          valueClassName={
            punctualityScore != null && punctualityScore >= 85
              ? 'text-emerald-600 dark:text-emerald-400'
              : undefined
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricTile
          label="Avg check-in"
          value={formatTime(averageCheckIn)}
          hint="Attendance times"
        />
        <MetricTile
          label="Avg check-out"
          value={formatTime(averageCheckOut)}
          hint="Attendance times"
        />
      </div>

      {showLiveBuckets ? (
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-4">
          <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Hours worked
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile label="Today" value={formatHours(hours.today)} />
            <MetricTile label="This week" value={formatHours(hours.thisWeek)} />
            <MetricTile label="This month" value={formatHours(hours.thisMonth)} />
            <MetricTile
              label="Payroll"
              value={formatHours(hours.payrollHours)}
              hint={payrollLabel}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
