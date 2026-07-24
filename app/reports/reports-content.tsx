'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Clock,
  Contact,
  LayoutDashboard,
  MapPin,
  Target,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useTokenReady, useSessionSync } from '@/api/hooks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { isReportsElevatedViewer } from '@/lib/access';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportsAttendanceTab } from '@/app/reports/components/reports-attendance-tab';
import { ReportsLeadsTab } from '@/app/reports/components/reports-leads-tab';
import { ReportsVisitsTab } from '@/app/reports/components/reports-visits-tab';
import { ReportsTargetsTab } from '@/app/reports/components/reports-targets-tab';
import { ReportsOverviewTab } from '@/app/reports/components/reports-overview-tab';
import { useReportsPrefetch, prefetchReportsSecondaryTabs } from '@/app/reports/use-reports-prefetch';
import {
  reportsTabTriggerClassName,
  reportsTabsListClassName,
} from '@/app/reports/reports-tab-styles';
import type { ReportsMode } from '@/app/reports/reports-mode';
import type { SyncProfile } from '@/api/types';

const REPORT_TABS = [
  { value: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { value: 'visits', label: 'Visits', Icon: MapPin },
  { value: 'attendance', label: 'Attendance', Icon: Clock },
  { value: 'leads', label: 'Leads', Icon: Contact },
  { value: 'targets', label: 'Targets', Icon: Target },
] as const;

function getValidReportsTab(value: string | null) {
  return REPORT_TABS.some((tab) => tab.value === value)
    ? (value as (typeof REPORT_TABS)[number]['value'])
    : 'overview';
}

const SECONDARY_PREFETCH_TABS = new Set(['leads', 'targets']);

function ReportsTabsEqualWidth({
  profile,
  reportsMode,
}: {
  profile: SyncProfile | null | undefined;
  reportsMode: ReportsMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const secondaryPrefetchRef = useRef(false);
  const initialTab = getValidReportsTab(searchParams.get('tab'));
  const listRef = useRef<HTMLDivElement>(null);
  const [tabWidthPx, setTabWidthPx] = useState<number | null>(null);
  const [activeTab, setActiveTab] =
    useState<(typeof REPORT_TABS)[number]['value']>(initialTab);

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
    setActiveTab(getValidReportsTab(searchParams.get('tab')));
  }, [searchParams]);

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

  const prefetchSecondaryTabs = useCallback(() => {
    if (secondaryPrefetchRef.current) return;
    secondaryPrefetchRef.current = true;
    prefetchReportsSecondaryTabs(queryClient, apiClient, {
      reportsMode,
      profile,
    });
  }, [apiClient, profile, queryClient, reportsMode]);

  const handleTabIntent = useCallback(
    (tabValue: (typeof REPORT_TABS)[number]['value']) => {
      if (SECONDARY_PREFETCH_TABS.has(tabValue)) {
        prefetchSecondaryTabs();
      }
    },
    [prefetchSecondaryTabs]
  );

  const renderTabPanel = (value: (typeof REPORT_TABS)[number]['value']) => {
    if (activeTab !== value) return null;
    const isActive = true;
    switch (value) {
      case 'overview':
        return (
          <ReportsOverviewTab
            profile={profile}
            reportsMode={reportsMode}
            isActive={isActive}
          />
        );
      case 'attendance':
        return (
          <ReportsAttendanceTab
            profile={profile}
            reportsMode={reportsMode}
            isActive={isActive}
          />
        );
      case 'visits':
        return (
          <ReportsVisitsTab
            profile={profile}
            reportsMode={reportsMode}
            isActive={isActive}
          />
        );
      case 'leads':
        return (
          <ReportsLeadsTab
            profile={profile}
            reportsMode={reportsMode}
            isActive={isActive}
          />
        );
      case 'targets':
        return (
          <ReportsTargetsTab
            profile={profile}
            reportsMode={reportsMode}
            isActive={isActive}
          />
        );
      default: {
        const _exhaustive: never = value;
        return _exhaustive;
      }
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as (typeof REPORT_TABS)[number]['value'])} className="w-full">
      <TabsList ref={listRef} className={reportsTabsListClassName}>
        {REPORT_TABS.map((tab) => {
          const { value, label, Icon } = tab;
          return (
            <TabsTrigger
              key={value}
              value={value}
              className={reportsTabTriggerClassName}
              onMouseEnter={() => handleTabIntent(value)}
              onFocus={() => handleTabIntent(value)}
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
          {renderTabPanel(value)}
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
      <main className="container mx-auto max-w-8xl px-3 py-8 sm:px-6 flex flex-col flex-1 min-h-0">
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
