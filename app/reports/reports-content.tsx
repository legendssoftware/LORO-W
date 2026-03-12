'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import {
  useTokenReady,
  useSessionSync,
  useCheckIns,
  useAttendanceReport,
  useMonthlyMetrics,
  useDailyOverview,
} from '@/api/hooks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { isStaffDashboardVisible } from '@/lib/access';
import type { VisitExportItem } from '@/api/types/reports';
import { visitListItemToExportItem } from '@/lib/utils/visits-export';
import { useVisitsStore } from '@/store/visits-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisitsChartsSection } from '@/app/reports/tabs/visits-charts-section';
import { AttendanceReportTab } from '@/app/reports/tabs/attendance-report-tab';
import { VisitsTable } from '@/components/visits-table/visits-table';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { useQueryClient } from '@tanstack/react-query';
import { CHECK_INS_LIST_QUERY_KEY } from '@/api/hooks/use-check-ins';

function getDefaultDateRange() {
  const today = new Date();
  return { start: subDays(today, 365), end: today };
}

/** Visits tab: visit charts and table with date range filter. Admin-only. Uses visits-store for filter state. */
function VisitsReportTab({ isTokenReady }: { isTokenReady: boolean }) {
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const {
    startDate: storeStart,
    endDate: storeEnd,
    dateRangePopoverOpen: popoverOpen,
    setStartDate: setStoreStart,
    setEndDate: setStoreEnd,
    setDateRangePopoverOpen: setPopoverOpen,
  } = useVisitsStore();
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>({
    from: storeStart,
    to: storeEnd,
  });

  useEffect(() => setMounted(true), []);

  const dateRange = { start: storeStart, end: storeEnd };

  const checkInsQuery = useCheckIns(
    {
      startDate: startOfDay(dateRange.start).toISOString(),
      endDate: endOfDay(dateRange.end).toISOString(),
    },
    { enabled: mounted && isTokenReady }
  );

  const todayDate = new Date();
  const todayStart = startOfDay(todayDate);
  const todayEnd = endOfDay(todayDate);
  const visitsTodayQuery = useCheckIns(
    {
      startDate: todayStart.toISOString(),
      endDate: todayEnd.toISOString(),
    },
    { enabled: mounted && isTokenReady }
  );

  const checkIns: VisitExportItem[] = (checkInsQuery.data?.checkIns ?? []).map(visitListItemToExportItem);
  const isLoading = checkInsQuery.isLoading;
  const visitsTodayCount = visitsTodayQuery.data?.checkIns?.length ?? 0;
  const visitsTodayLoading = visitsTodayQuery.isLoading;

  const handleApplyDateRange = () => {
    if (pickerRange?.from) {
      const start = pickerRange.from;
      const end = pickerRange.to ?? pickerRange.from;
      const orderedStart = start < end ? start : end;
      const orderedEnd = start < end ? end : start;
      setStoreStart(orderedStart);
      setStoreEnd(orderedEnd);
      setPopoverOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setPopoverOpen(open);
    if (!open) return;
    setPickerRange({ from: dateRange.start, to: dateRange.end });
  };

  const handleVisitUpdated = () => {
    void queryClient.refetchQueries({ queryKey: CHECK_INS_LIST_QUERY_KEY });
  };

  return (
    <div className="space-y-4">
      <div className="shrink-0 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {!isLoading && (
              <p className="text-sm text-muted-foreground">
                {format(dateRange.start, 'MMM d, yyyy')} – {format(dateRange.end, 'MMM d, yyyy')}
                {' · '}
                Visits Today:{' '}
                <strong>
                  {visitsTodayLoading ? '—' : visitsTodayCount.toLocaleString()}
                </strong>
              </p>
            )}
          </div>
          <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <CalendarIcon className="size-4" />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 space-y-3">
                <Calendar
                  mode="range"
                  selected={pickerRange}
                  onSelect={setPickerRange}
                  defaultMonth={dateRange.start}
                  numberOfMonths={2}
                />
                <div className="flex justify-end border-t pt-3">
                  <Button size="sm" onClick={handleApplyDateRange}>
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <VisitsChartsSection
          checkIns={checkIns}
          reportTotal={checkIns.length}
          reportLoading={isLoading}
        />
      </div>
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Visits table</h3>
        <VisitsTable
          checkIns={checkIns}
          isLoading={isLoading}
          emptyMessage="No visits in this date range."
          onVisitUpdated={handleVisitUpdated}
        />
      </div>
    </div>
  );
}

/** Attendance tab: org report + monthly metrics with date range filter. Admin-only. */
function AttendanceReportTabContainer({ isTokenReady }: { isTokenReady: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(getDefaultDateRange);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>({
    from: dateRange.start,
    to: dateRange.end,
  });

  useEffect(() => setMounted(true), []);

  const dateFrom = format(startOfDay(dateRange.start), 'yyyy-MM-dd');
  const dateTo = format(endOfDay(dateRange.end), 'yyyy-MM-dd');
  const endMonth = dateRange.end;
  const year = endMonth.getFullYear();
  const month = endMonth.getMonth() + 1;

  const reportQuery = useAttendanceReport(
    { dateFrom, dateTo },
    { enabled: mounted && isTokenReady }
  );
  const monthlyQuery = useMonthlyMetrics(
    { year, month, includeCheckIns: false },
    { enabled: mounted && isTokenReady }
  );
  const dailyQuery = useDailyOverview(
    { date: dateTo },
    { enabled: mounted && isTokenReady }
  );

  const report = reportQuery.data?.report;
  const monthlyData = monthlyQuery.data?.data;
  const dailyData = dailyQuery.data?.data;
  const isLoading = reportQuery.isLoading || monthlyQuery.isLoading || dailyQuery.isLoading;

  const dailyOverview = dailyData
    ? {
        date: dailyData.date,
        presentEmployees: dailyData.presentEmployees,
        absentEmployees: dailyData.absentEmployees,
        attendanceRate: dailyData.attendanceRate,
        totalEmployees: dailyData.totalEmployees,
      }
    : null;

  const handleApplyDateRange = () => {
    if (pickerRange?.from) {
      const start = pickerRange.from;
      const end = pickerRange.to ?? pickerRange.from;
      setDateRange({
        start: start < end ? start : end,
        end: start < end ? end : start,
      });
      setPopoverOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setPopoverOpen(open);
    if (!open) return;
    setPickerRange({ from: dateRange.start, to: dateRange.end });
  };

  const attendanceRate = report?.organizationMetrics?.insights?.attendanceRate ?? 0;
  const reportPeriod = report?.reportPeriod;
  const organizationMetrics = report?.organizationMetrics;
  const monthlySummary = monthlyData?.summary;
  const monthlyUserMetrics = monthlyData?.userMetrics ?? [];

  return (
    <div className="space-y-4">
      <div className="shrink-0 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {!isLoading && (
              <p className="text-sm text-muted-foreground">
                {format(dateRange.start, 'MMM d, yyyy')} – {format(dateRange.end, 'MMM d, yyyy')}
                {' · '}
                Attendance rate:{' '}
                <strong>{typeof attendanceRate === 'number' ? `${attendanceRate.toFixed(1)}%` : '—'}</strong>
              </p>
            )}
          </div>
          <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <CalendarIcon className="size-4" />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 space-y-3">
                <Calendar
                  mode="range"
                  selected={pickerRange}
                  onSelect={setPickerRange}
                  defaultMonth={dateRange.start}
                  numberOfMonths={2}
                />
                <div className="flex justify-end border-t pt-3">
                  <Button size="sm" onClick={handleApplyDateRange}>
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <AttendanceReportTab
          attendanceChartsProps={{
            attendanceRate: typeof attendanceRate === 'number' ? attendanceRate : 0,
            reportPeriod,
            organizationMetrics,
            monthlySummary,
            monthlyUserMetrics,
            dailyOverview,
            monthForMetrics: month,
            yearForMetrics: year,
          }}
          chartsLoading={isLoading}
        />
      </div>
    </div>
  );
}

export function ReportsContent() {
  const { isSignedIn } = useAuth();
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();
  const isStaff = isStaffDashboardVisible(profile?.accessLevel);
  const isVisitsAdmin = profile?.accessLevel?.toLowerCase() === 'admin';

  return (
    <div className="flex flex-col h-full min-h-0">
      <main className="container mx-auto max-w-6xl lg:max-w-[88rem] px-3 py-8 sm:px-6 flex flex-col flex-1 min-h-0">
        <h1 className="text-2xl font-semibold text-foreground mb-6 shrink-0">
          Reports
        </h1>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {!isSignedIn || !isTokenReady ? (
            <LoadingSpinner wrapperClassName="py-12" />
          ) : profile && !isStaff ? (
            <p className="text-center text-muted-foreground py-12">
              Reports are available to staff only.
            </p>
          ) : isVisitsAdmin ? (
            <Tabs defaultValue="visits" className="flex flex-col flex-1 min-h-0">
              <TabsList variant="purple" className="mb-4 shrink-0">
                <TabsTrigger value="visits">Visits</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
              </TabsList>
              <TabsContent value="visits" className="flex-1 min-h-0 mt-0">
                <VisitsReportTab isTokenReady={isTokenReady} />
              </TabsContent>
              <TabsContent value="attendance" className="flex-1 min-h-0 mt-0">
                <AttendanceReportTabContainer isTokenReady={isTokenReady} />
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Reports are available to admin only.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
