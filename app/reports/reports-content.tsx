'use client';

import { useState, type ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useSessionSync } from '@/api/hooks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getReportsDataScope } from '@/lib/access';
import { appPageMainClass, appPageScrollWrapClass } from '@/lib/page-shell';
import { cn } from '@/lib/utils';
import { REPORTS_TABS, reportsSubtitle, type ReportsTabId } from './lib/reports-registry';

function ReportsTabFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

const ReportsOverviewTab = dynamic(
  () => import('./components/reports-overview-tab').then((mod) => mod.ReportsOverviewTab),
  { loading: ReportsTabFallback },
);
const ReportsPolicyTab = dynamic(
  () => import('./components/reports-policy-tab').then((mod) => mod.ReportsPolicyTab),
  { loading: ReportsTabFallback },
);
const ReportsCallQualityTab = dynamic(
  () => import('./components/reports-call-quality-tab').then((mod) => mod.ReportsCallQualityTab),
  { loading: ReportsTabFallback },
);
const ReportsInsightsTab = dynamic(
  () => import('./components/reports-insights-tab').then((mod) => mod.ReportsInsightsTab),
  { loading: ReportsTabFallback },
);
const ReportsTasksTab = dynamic(
  () => import('./components/reports-tasks-tab').then((mod) => mod.ReportsTasksTab),
  { loading: ReportsTabFallback },
);

function reportsTabComponent(id: ReportsTabId): ComponentType {
  switch (id) {
    case 'targets':
      return ReportsOverviewTab;
    case 'policy':
      return ReportsPolicyTab;
    case 'call-quality':
      return ReportsCallQualityTab;
    case 'insights':
      return ReportsInsightsTab;
    case 'tasks':
      return ReportsTasksTab;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

const reportsTabListClass =
  'mb-4 h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0 text-muted-foreground';

const reportsTabTriggerClass = cn(
  'relative inline-flex h-auto items-center gap-2 rounded-none border-0 border-b-2 border-transparent',
  'bg-transparent px-3 pb-2.5 pt-1.5 text-sm font-medium text-muted-foreground shadow-none',
  'ring-offset-background transition-colors',
  'hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'data-[state=active]:border-violet-600 data-[state=active]:bg-transparent',
  'data-[state=active]:text-foreground data-[state=active]:shadow-none'
);

export function ReportsContent() {
  const { backendUserData } = useSessionSync();
  const scope = getReportsDataScope(backendUserData?.accessLevel, backendUserData);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const initialTab = REPORTS_TABS.some((tab) => tab.id === requestedTab)
    ? (requestedTab as string)
    : REPORTS_TABS[0].id;
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  return (
    <div className={appPageScrollWrapClass} data-slot="reports-page">
      <main className={cn(appPageMainClass, 'flex min-h-0 flex-1 flex-col')}>
        <div
          className="mb-6 flex shrink-0 flex-col gap-1"
          data-tour="reports-page-header"
        >
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            Reports
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {reportsSubtitle(scope)}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className={reportsTabListClass} data-tour="reports-tabs">
            {REPORTS_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={reportsTabTriggerClass}
                  data-tour={`reports-tab-${tab.id}`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {REPORTS_TABS.map((tab) => {
            const TabComponent = reportsTabComponent(tab.id);
            return (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
              >
                {activeTab === tab.id ? <TabComponent /> : null}
              </TabsContent>
            );
          })}
        </Tabs>
      </main>
    </div>
  );
}
