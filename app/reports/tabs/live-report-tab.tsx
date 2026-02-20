'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useDailyOverview, useMonthlyMetrics, useCheckIns, useCheckInsReport } from '@/api/hooks';
import { AttendanceChartsSection } from '@/app/reports/tabs/attendance-charts-section';
import { VisitsChartsSection } from '@/app/reports/tabs/visits-charts-section';
import { ExportReportDropdown } from '@/app/reports/export-report-dropdown';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DownloadIcon, Loader2Icon, ChevronDownIcon } from '@/lib/icons';
import { exportVisits } from '@/lib/utils/visits-export';
import type { VisitExportItem } from '@/api/types/reports';
import toast from 'react-hot-toast';

const OverviewMap = dynamic(
  () => import('@/app/reports/overview-map').then((m) => m.OverviewMap),
  { ssr: false }
);

export interface LiveReportTabProps {
  isTokenReady: boolean;
}

/** Live tab: today's attendance + current month hours, charts from metrics response. */
export function LiveReportTab({ isTokenReady }: LiveReportTabProps) {
  const [mounted, setMounted] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [liveVisitsAllTime, setLiveVisitsAllTime] = useState(false);
  useEffect(() => setMounted(true), []);
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const dailyQuery = useDailyOverview(
    { date: todayStr },
    { enabled: mounted && isTokenReady }
  );
  const monthlyQuery = useMonthlyMetrics(
    { year, month, includeCheckIns: false },
    { enabled: mounted && isTokenReady }
  );

  const presentCount = dailyQuery.data?.data?.presentEmployees ?? 0;
  const absentCount = dailyQuery.data?.data?.absentEmployees ?? 0;
  const attendanceRate = dailyQuery.data?.data?.attendanceRate ?? 0;

  const { totalHours, totalOvertimeHours } = useMemo(() => {
    const summary = monthlyQuery.data?.data?.summary;
    return {
      totalHours: summary?.totalHours ?? 0,
      totalOvertimeHours: summary?.totalOvertimeHours ?? 0,
    };
  }, [monthlyQuery.data]);

  const { lateCount, onTimeCount } = useMemo(() => {
    const present = dailyQuery.data?.data?.presentUsers ?? [];
    const late = present.filter((u) => (u.lateMinutes ?? 0) > 0).length;
    return {
      lateCount: late,
      onTimeCount: present.length - late,
    };
  }, [dailyQuery.data?.data?.presentUsers]);

  const isLoading = dailyQuery.isLoading || monthlyQuery.isLoading;

  const visitsStartStr = format(subDays(today, 30), 'yyyy-MM-dd');
  const visitsEndStr = format(today, 'yyyy-MM-dd');
  const reportStartStr = liveVisitsAllTime ? format(subDays(today, 365), 'yyyy-MM-dd') : visitsStartStr;
  const reportEndStr = liveVisitsAllTime ? visitsEndStr : visitsEndStr;
  const checkInsQuery = useCheckIns(
    liveVisitsAllTime
      ? {}
      : {
          startDate: startOfDay(subDays(today, 30)).toISOString(),
          endDate: endOfDay(today).toISOString(),
        },
    { enabled: mounted && isTokenReady }
  );
  const reportQuery = useCheckInsReport(
    { from: reportStartStr, to: reportEndStr },
    { enabled: mounted && isTokenReady }
  );
  const checkIns: VisitExportItem[] = checkInsQuery.data?.checkIns ?? [];

  const handleVisitsExport = (exportFormat: 'csv' | 'excel' | 'pdf') => {
    if (checkIns.length === 0) {
      toast.error('No visits to export');
      return;
    }
    setExportLoading(true);
    const baseName = liveVisitsAllTime ? 'visits-all-time' : `visits-${visitsStartStr}-${visitsEndStr}`;
    try {
      exportVisits(checkIns, exportFormat, baseName);
      toast.success('Export downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Today ({format(today, 'PPP')}) · Attendance rate: <strong>{attendanceRate}%</strong>
        </p>
        <ExportReportDropdown singleDate={today} />
      </div>
      <AttendanceChartsSection
        presentCount={presentCount}
        absentCount={absentCount}
        attendanceRate={attendanceRate}
        lateCount={lateCount}
        onTimeCount={onTimeCount}
        userMetrics={monthlyQuery.data?.data?.userMetrics ?? []}
        totalHours={totalHours}
        totalOvertimeHours={totalOvertimeHours}
        chartsLoading={isLoading}
      />

      <Separator className="my-6" />

      <section className="pt-2">
        <OverviewMap />
      </section>

      <Separator className="my-6" />

      <section className="pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm text-muted-foreground">
            {liveVisitsAllTime ? 'All time' : 'Last 30 days'} · Total visits:{' '}
            <strong>{(reportQuery.data?.total ?? checkIns.length).toLocaleString()}</strong>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 ml-2 text-muted-foreground"
              onClick={() => setLiveVisitsAllTime((v) => !v)}
            >
              {liveVisitsAllTime ? 'Show last 30 days' : 'Show all time'}
            </Button>
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 bg-white border-gray-200 text-foreground gap-1.5"
                disabled={exportLoading || checkIns.length === 0}
              >
                {exportLoading ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <DownloadIcon className="size-4" />
                )}
                Export
                <ChevronDownIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[10rem]">
              <DropdownMenuItem onClick={() => handleVisitsExport('csv')}>
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleVisitsExport('excel')}>
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleVisitsExport('pdf')}>
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <VisitsChartsSection
          checkIns={checkIns}
          reportTotal={reportQuery.data?.total}
          reportLoading={reportQuery.isLoading}
        />
      </section>
    </div>
  );
}
