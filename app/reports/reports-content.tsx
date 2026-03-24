'use client';

import { useAuth } from '@clerk/nextjs';
import {
  CalendarDays,
  Clock,
  Contact,
  LayoutDashboard,
  Map,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTokenReady, useSessionSync } from '@/api/hooks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { isStaffDashboardVisible } from '@/lib/access';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportsAttendanceTab } from '@/app/reports/components/reports-attendance-tab';
import { ReportsLeadsTab } from '@/app/reports/components/reports-leads-tab';
import { ReportsVisualiserTab } from '@/app/reports/components/reports-visualiser-tab';
import { ReportsVisitsTab } from '@/app/reports/components/reports-visits-tab';
import type { SyncProfile } from '@/api/types';

const REPORT_TABS = [
  { value: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { value: 'visits', label: 'Visits', Icon: MapPin },
  { value: 'attendance', label: 'Attendance', Icon: Clock },
  { value: 'leads', label: 'Leads', Icon: Contact },
  { value: 'planning', label: 'Planning', Icon: CalendarDays },
  { value: 'sales', label: 'Sales', Icon: TrendingUp },
  { value: 'visualiser', label: 'Visualiser', Icon: Map },
] as const;

const tabTriggerClassName =
  'inline-flex items-center gap-2 shrink-0 justify-center whitespace-nowrap rounded-md border-0 bg-transparent px-4 py-2 text-sm font-medium text-zinc-500 shadow-none ring-0 transition-colors hover:bg-transparent hover:text-zinc-700 focus-visible:ring-violet-500/40 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:hover:bg-violet-700 data-[state=active]:hover:text-white dark:text-zinc-400 dark:hover:text-zinc-300 dark:data-[state=active]:bg-violet-600 dark:data-[state=active]:text-white';

function ReportsPlaceholderPanel() {
  return (
    <p className="text-center text-muted-foreground py-12">Reports coming soon</p>
  );
}

function ReportsTabsEqualWidth({
  profile,
}: {
  profile: SyncProfile | null | undefined;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [tabWidthPx, setTabWidthPx] = useState<number | null>(null);

  const measureTabWidths = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const buttons = [...el.querySelectorAll('[role="tab"]')] as HTMLElement[];
    if (buttons.length === 0) return;
    const maxPx = Math.max(
      ...buttons.map((b) => b.getBoundingClientRect().width)
    );
    if (maxPx > 0) setTabWidthPx(Math.ceil(maxPx));
  }, []);

  useLayoutEffect(() => {
    measureTabWidths();
  }, [measureTabWidths]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureTabWidths());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureTabWidths]);

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList
        ref={listRef}
        className="h-auto w-full flex flex-wrap justify-start gap-4 bg-transparent p-0 sm:gap-6"
      >
        {REPORT_TABS.map((tab) => {
          const { value, label, Icon } = tab;
          return (
            <TabsTrigger
              key={value}
              value={value}
              className={tabTriggerClassName}
              style={
                tabWidthPx != null
                  ? { minWidth: tabWidthPx, width: tabWidthPx }
                  : undefined
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {REPORT_TABS.map(({ value }) => (
        <TabsContent key={value} value={value}>
          {value === 'attendance' ? (
            <ReportsAttendanceTab profile={profile} />
          ) : value === 'visits' ? (
            <ReportsVisitsTab profile={profile} />
          ) : value === 'leads' ? (
            <ReportsLeadsTab profile={profile} />
          ) : value === 'visualiser' ? (
            <ReportsVisualiserTab profile={profile} />
          ) : (
            <ReportsPlaceholderPanel />
          )}
        </TabsContent>
      ))}
    </Tabs>
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
            <ReportsTabsEqualWidth profile={profile} />
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
