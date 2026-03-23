'use client';

import { useState, useEffect, useMemo } from 'react';
import { endOfDay, format, startOfDay } from 'date-fns';
import {
  useTokenReady,
  useDailyOverview,
  useMonthlyMetrics,
  usePayrollHoursAll,
  useUsers,
  useBranches,
} from '@/api/hooks';
import type { DailyOverviewUser } from '@/api/types/attendance';
import type { MonthlyMetricsUserItem } from '@/api/types';
import { AttendanceChartsSection } from '@/app/reports/tabs/attendance-charts-section';
import { PayrollSummaryDialog } from '@/app/reports/components/payroll-summary-dialog';
import { regionKeyFromBranch } from '@/app/reports/utils/branch-region';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UsersIcon, MapPinIcon } from '@/lib/icons';
import { CalendarIcon, Building2, BarChart3 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

const today = new Date();
const defaultReportStart = startOfDay(today);
const defaultReportEnd = endOfDay(today);

export function AttendanceReportTab({ isTokenReady }: { isTokenReady: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [startDate, setStartDate] = useState<Date>(() => defaultReportStart);
  const [endDate, setEndDate] = useState<Date>(() => defaultReportEnd);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>({
    from: defaultReportStart,
    to: defaultReportEnd,
  });
  const [selectedUserUid, setSelectedUserUid] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedBranchUid, setSelectedBranchUid] = useState<string>('');
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const dateRange = { start: startDate, end: endDate };
  const overviewDateStr = format(endDate, 'yyyy-MM-dd');
  const monthForMetrics = endDate.getMonth() + 1;
  const yearForMetrics = endDate.getFullYear();

  const dailyQuery = useDailyOverview(
    { date: overviewDateStr },
    { enabled: mounted && isTokenReady }
  );

  const monthlyQuery = useMonthlyMetrics(
    { year: yearForMetrics, month: monthForMetrics, includeCheckIns: false },
    { enabled: mounted && isTokenReady }
  );

  const payrollQuery = usePayrollHoursAll(
    { branchId: selectedBranchUid || undefined },
    { enabled: mounted && isTokenReady }
  );

  const usersQuery = useUsers({ limit: 200, enabled: mounted && isTokenReady });
  const branchesQuery = useBranches({ enabled: mounted && isTokenReady });

  const branches = branchesQuery.data ?? [];

  const monthlyByUserId = useMemo(() => {
    const map = new Map<number, MonthlyMetricsUserItem>();
    const list = monthlyQuery.data?.data?.userMetrics ?? [];
    list.forEach((u: MonthlyMetricsUserItem) => map.set(u.userId, u));
    return map;
  }, [monthlyQuery.data]);

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of branches) {
      set.add(regionKeyFromBranch(b.uid, branches));
    }
    return Array.from(set).sort();
  }, [branches]);

  const rawPresent = dailyQuery.data?.data?.presentUsers ?? [];
  const rawAbsent = dailyQuery.data?.data?.absentUsers ?? [];
  const branchLocationRadiusMeters =
    dailyQuery.data?.data?.branchLocationRadiusMeters ?? 100;

  const filteredPresentUsers = useMemo((): DailyOverviewUser[] => {
    let list = rawPresent;
    if (selectedUserUid) {
      const uid = Number(selectedUserUid);
      list = list.filter((u) => u.uid === uid);
    }
    if (selectedBranchUid) {
      const bid = Number(selectedBranchUid);
      list = list.filter((u) => u.branchId === bid);
    }
    if (selectedRegion) {
      list = list.filter(
        (u) => regionKeyFromBranch(u.branchId ?? null, branches) === selectedRegion
      );
    }
    return list;
  }, [rawPresent, selectedUserUid, selectedBranchUid, selectedRegion, branches]);

  const filteredAbsentUsers = useMemo((): DailyOverviewUser[] => {
    let list = rawAbsent;
    if (selectedUserUid) {
      const uid = Number(selectedUserUid);
      list = list.filter((u) => u.uid === uid);
    }
    if (selectedBranchUid) {
      const bid = Number(selectedBranchUid);
      list = list.filter((u) => u.branchId === bid);
    }
    if (selectedRegion) {
      list = list.filter(
        (u) => regionKeyFromBranch(u.branchId ?? null, branches) === selectedRegion
      );
    }
    return list;
  }, [rawAbsent, selectedUserUid, selectedBranchUid, selectedRegion, branches]);

  const presentCountForSummary = filteredPresentUsers.length;

  const isLoading = dailyQuery.isLoading || monthlyQuery.isLoading;

  const handleApplyDateRange = () => {
    if (pickerRange?.from) {
      const start = pickerRange.from;
      const end = pickerRange.to ?? pickerRange.from;
      const orderedStart = start < end ? start : end;
      const orderedEnd = start < end ? end : start;
      setStartDate(orderedStart);
      setEndDate(orderedEnd);
      setPopoverOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setPopoverOpen(open);
    if (!open) return;
    setPickerRange({ from: dateRange.start, to: dateRange.end });
  };

  const users = usersQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="shrink-0 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {!isLoading && (
              <p className="text-sm text-muted-foreground">
                {format(dateRange.start, 'MMM d, yyyy')} – {format(dateRange.end, 'MMM d, yyyy')}
                {' · '}
                Present (selected day):{' '}
                <strong>{presentCountForSummary.toLocaleString()}</strong>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 bg-white border-gray-200 text-foreground shrink-0"
              onClick={() => setSummaryOpen(true)}
            >
              <BarChart3 className="size-4 shrink-0" />
              Summary
            </Button>
            <Select
              value={selectedUserUid || 'all'}
              onValueChange={(v) => setSelectedUserUid(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-[160px] shrink-0 bg-white border-gray-200 text-foreground gap-2">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <UsersIcon className="size-4 shrink-0" />
                    All users
                  </span>
                </SelectItem>
                {users.map((u) => {
                  const fullName = [u.name, u.surname].filter(Boolean).join(' ').trim() || `User ${u.uid}`;
                  const imgSrc =
                    (u as { photoURL?: string | null; avatar?: string | null }).photoURL ??
                    (u as { photoURL?: string | null; avatar?: string | null }).avatar ??
                    undefined;
                  const initials =
                    fullName !== `User ${u.uid}` ? fullName.slice(0, 2).toUpperCase() : String(u.uid).slice(-2);
                  return (
                    <SelectItem key={u.uid} value={String(u.uid)}>
                      <span className="flex items-center gap-2">
                        <Avatar className="size-6 shrink-0">
                          <AvatarImage src={imgSrc} alt={fullName} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        {fullName}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select
              value={selectedRegion || 'all'}
              onValueChange={(v) => setSelectedRegion(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-[180px] shrink-0 bg-white border-gray-200 text-foreground gap-2">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <MapPinIcon className="size-4 shrink-0" />
                    All regions
                  </span>
                </SelectItem>
                {regionOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    <span className="flex items-center gap-2">
                      <MapPinIcon className="size-4 shrink-0" />
                      {r}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedBranchUid || 'all'}
              onValueChange={(v) => setSelectedBranchUid(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-[160px] shrink-0 bg-white border-gray-200 text-foreground gap-2">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <Building2 className="size-4 shrink-0" />
                    All branches
                  </span>
                </SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.uid} value={String(b.uid)}>
                    <span className="flex items-center gap-2">
                      <Building2 className="size-4 shrink-0" />
                      {b.name?.trim() || `Branch ${b.uid}`}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>

        <AttendanceChartsSection
          filteredPresentUsers={filteredPresentUsers}
          filteredAbsentUsers={filteredAbsentUsers}
          branchLocationRadiusMeters={branchLocationRadiusMeters}
          chartsLoading={isLoading}
        />
      </div>

      <PayrollSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        payrollData={payrollQuery.data}
        payrollIsLoading={payrollQuery.isLoading}
        monthlyByUserId={monthlyByUserId}
        presentUsers={rawPresent}
        absentUsers={rawAbsent}
        yearForMetrics={yearForMetrics}
        monthForMetrics={monthForMetrics}
      />
    </div>
  );
}
