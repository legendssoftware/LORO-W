'use client';

import { useAuth } from '@clerk/nextjs';
import {
  Clock,
  Contact,
  LayoutDashboard,
  Map,
  MapPin,
  Target,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTokenReady, useSessionSync } from '@/api/hooks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { isReportsElevatedViewer } from '@/lib/access';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportsAttendanceTab } from '@/app/reports/components/reports-attendance-tab';
import { ReportsLeadsTab } from '@/app/reports/components/reports-leads-tab';
import { ReportsVisualiserTab } from '@/app/reports/components/reports-visualiser-tab';
import { ReportsVisitsTab } from '@/app/reports/components/reports-visits-tab';
import { ReportsTargetsTab } from '@/app/reports/components/reports-targets-tab';
import { ReportsOverviewTab } from '@/app/reports/components/reports-overview-tab';
import { useReportsPrefetch } from '@/app/reports/use-reports-prefetch';
import type { SyncProfile } from '@/api/types';

export type ReportsMode = 'org' | 'self';

const REPORT_TABS = [
  { value: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { value: 'visits', label: 'Visits', Icon: MapPin },
  { value: 'attendance', label: 'Attendance', Icon: Clock },
  { value: 'leads', label: 'Leads', Icon: Contact },
  { value: 'targets', label: 'Targets', Icon: Target },
  { value: 'visualiser', label: 'Visualiser', Icon: Map },
] as const;

const tabTriggerClassName =
  'inline-flex items-center gap-2 shrink-0 justify-center whitespace-nowrap rounded-md border-0 bg-transparent px-4 py-2 text-sm font-medium text-zinc-500 shadow-none ring-0 transition-colors hover:bg-transparent hover:text-zinc-700 focus-visible:ring-violet-500/40 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:hover:bg-violet-700 data-[state=active]:hover:text-white dark:text-zinc-400 dark:hover:text-zinc-300 dark:data-[state=active]:bg-violet-600 dark:data-[state=active]:text-white';

function ReportsTabsEqualWidth({
  profile,
  reportsMode,
}: {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [tabWidthPx, setTabWidthPx] = useState<number | null>(null);
  const [activeTab, setActiveTab] =
    useState<(typeof REPORT_TABS)[number]['value']>('overview');

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

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const activeTabButton = el.querySelector(
      '[role="tab"][data-state="active"]'
    ) as HTMLElement | null;
    activeTabButton?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeTab]);

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as (typeof REPORT_TABS)[number]['value'])} className="w-full">
      <TabsList
        ref={listRef}
        className="h-auto w-full flex flex-nowrap justify-start gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap bg-transparent p-0 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
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
          {value === 'overview' ? (
            <ReportsOverviewTab profile={profile} reportsMode={reportsMode} />
          ) : value === 'attendance' ? (
            <ReportsAttendanceTab profile={profile} reportsMode={reportsMode} />
          ) : value === 'visits' ? (
            <ReportsVisitsTab profile={profile} reportsMode={reportsMode} />
          ) : value === 'leads' ? (
            <ReportsLeadsTab profile={profile} reportsMode={reportsMode} />
          ) : value === 'targets' ? (
            <ReportsTargetsTab profile={profile} reportsMode={reportsMode} />
          ) : value === 'visualiser' ? (
            <ReportsVisualiserTab profile={profile} reportsMode={reportsMode} />
          ) : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function ReportsContent() {
  const { isSignedIn } = useAuth();
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();
  const reportsMode: ReportsMode = isReportsElevatedViewer(
    profile?.accessLevel
  )
    ? 'org'
    : 'self';

  useReportsPrefetch({
    enabled: Boolean(isSignedIn && isTokenReady && profile),
    reportsMode,
    profile,
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <main className="container mx-auto max-w-6xl lg:max-w-[88rem] px-3 py-8 sm:px-6 flex flex-col flex-1 min-h-0">
        <h1 className="text-2xl font-semibold text-foreground mb-6 shrink-0">
          Reports
        </h1>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {!isSignedIn || !isTokenReady ? (
            <LoadingSpinner wrapperClassName="py-12" />
          ) : profile ? (
            <ReportsTabsEqualWidth profile={profile} reportsMode={reportsMode} />
          ) : (
            <LoadingSpinner wrapperClassName="py-12" />
          )}
        </div>
      </main>
    </div>
  );
}
