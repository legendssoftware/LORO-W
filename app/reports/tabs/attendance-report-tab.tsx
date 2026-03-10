'use client';

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
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AttendanceChartsSection
        {...attendanceChartsProps}
        chartsLoading={chartsLoading}
      />
    </div>
  );
}
