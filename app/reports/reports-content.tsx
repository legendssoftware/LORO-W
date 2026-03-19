'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { endOfDay, format, startOfDay, isWithinInterval, parseISO } from 'date-fns';
import { useTokenReady, useSessionSync, useCheckIns, useUsers, useBranches } from '@/api/hooks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { isStaffDashboardVisible } from '@/lib/access';
import type { VisitExportItem } from '@/api/types/reports';
import { visitListItemToExportItem } from '@/lib/utils/visits-export';
import { VisitsChartsSection, extractRegionFromVisit } from '@/app/reports/tabs/visits-charts-section';
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
import { CalendarIcon, Building2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

const today = new Date();
const defaultReportStart = startOfDay(today);
const defaultReportEnd = endOfDay(today);

/** Visits report: visit charts with date range and User/Region/Branch filters. Admin-only. Default date range is today only. */
function VisitsReportTab({ isTokenReady }: { isTokenReady: boolean }) {
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

  useEffect(() => setMounted(true), []);

  const dateRange = { start: startDate, end: endDate };

  const checkInsQuery = useCheckIns(
    {
      startDate: startOfDay(dateRange.start).toISOString(),
      endDate: endOfDay(dateRange.end).toISOString(),
      ...(selectedUserUid ? { userUid: selectedUserUid } : {}),
      ...(selectedBranchUid ? { branchId: Number(selectedBranchUid) } : {}),
    },
    { enabled: mounted && isTokenReady }
  );

  const usersQuery = useUsers({ enabled: mounted && isTokenReady });
  const branchesQuery = useBranches({ enabled: mounted && isTokenReady });

  const rawCheckIns: VisitExportItem[] = useMemo(
    () => (checkInsQuery.data?.checkIns ?? []).map(visitListItemToExportItem),
    [checkInsQuery.data?.checkIns]
  );

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of rawCheckIns) {
      set.add(extractRegionFromVisit(c));
    }
    return Array.from(set).sort();
  }, [rawCheckIns]);

  const filteredCheckIns = useMemo(() => {
    let list = rawCheckIns;
    if (selectedUserUid) {
      const uid = Number(selectedUserUid);
      list = list.filter((c) => (c.owner as { uid?: number } | undefined)?.uid === uid);
    }
    if (selectedRegion) {
      list = list.filter((c) => extractRegionFromVisit(c) === selectedRegion);
    }
    if (selectedBranchUid) {
      const branchUid = Number(selectedBranchUid);
      list = list.filter((c) => c.branch?.uid === branchUid);
    }
    return list;
  }, [rawCheckIns, selectedUserUid, selectedRegion, selectedBranchUid]);

  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const visitsTodayCount = useMemo(() => {
    return filteredCheckIns.filter((c) => {
      const t = parseISO(c.checkInTime);
      return isWithinInterval(t, { start: todayStart, end: todayEnd });
    }).length;
  }, [filteredCheckIns]);

  const isLoading = checkInsQuery.isLoading;

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
  const branches = branchesQuery.data ?? [];

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
                <strong>{visitsTodayCount.toLocaleString()}</strong>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
                  const imgSrc = (u as { photoURL?: string | null; avatar?: string | null }).photoURL ?? (u as { photoURL?: string | null; avatar?: string | null }).avatar ?? undefined;
                  const initials = fullName !== `User ${u.uid}` ? fullName.slice(0, 2).toUpperCase() : String(u.uid).slice(-2);
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
        <VisitsChartsSection
          checkIns={filteredCheckIns}
          reportTotal={filteredCheckIns.length}
          reportLoading={isLoading}
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
            <VisitsReportTab isTokenReady={isTokenReady} />
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
