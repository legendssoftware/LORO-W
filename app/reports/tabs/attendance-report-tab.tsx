'use client';

import { format } from 'date-fns';
import { AttendanceChartsSection } from '@/app/reports/tabs/attendance-charts-section';
import type { AttendanceChartsSectionProps } from '@/app/reports/tabs/attendance-charts-section';

export interface AttendanceReportTabProps {
  attendanceChartsProps: Omit<AttendanceChartsSectionProps, 'chartsLoading'>;
  chartsLoading: boolean;
}

export function AttendanceReportTab({
  attendanceChartsProps,
  chartsLoading,
}: AttendanceReportTabProps) {
  const today = new Date();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 mb-6">
        {!chartsLoading && (
          <p className="text-sm text-muted-foreground mb-3">
            {format(today, 'PPP')} · Attendance rate: <strong>{attendanceChartsProps.attendanceRate}%</strong>
          </p>
        )}
        <AttendanceChartsSection
          {...attendanceChartsProps}
          chartsLoading={chartsLoading}
        />
      </div>
    </div>
  );
}
