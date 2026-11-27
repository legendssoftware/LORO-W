'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { DriveStep, Driver } from 'driver.js';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { canAccessReports } from '@/lib/access';
import { readReportsTourState, writeReportsTourState } from '@/lib/reports-tour-storage';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const SEL_HEADER = '[data-tour="reports-page-header"]';
const SEL_TABS = '[data-tour="reports-tabs"]';
const SEL_TARGETS = '[data-tour="reports-targets-toolbar"]';
const SEL_POLICY = '[data-tour="reports-policy-tab"]';
const SEL_QUALITY = '[data-tour="reports-call-quality-tab"]';
const SEL_INSIGHTS = '[data-tour="reports-insights-tab"]';
const SEL_TASKS = '[data-tour="reports-tasks-tab"]';
const SEL_LEADS = '[data-tour="reports-leads-activity-tab"]';
const SEL_TAB_TARGETS = '[data-tour="reports-tab-targets"]';
const SEL_TAB_POLICY = '[data-tour="reports-tab-policy"]';
const SEL_TAB_QUALITY = '[data-tour="reports-tab-call-quality"]';
const SEL_TAB_INSIGHTS = '[data-tour="reports-tab-insights"]';
const SEL_TAB_TASKS = '[data-tour="reports-tab-tasks"]';
const SEL_TAB_LEADS = '[data-tour="reports-tab-leads-activity"]';

const REQUIRED = [SEL_HEADER, SEL_TABS] as const;

const TAB_FOR_STEP: Record<string, string> = {
  [SEL_TARGETS]: SEL_TAB_TARGETS,
  [SEL_POLICY]: SEL_TAB_POLICY,
  [SEL_QUALITY]: SEL_TAB_QUALITY,
  [SEL_INSIGHTS]: SEL_TAB_INSIGHTS,
  [SEL_TASKS]: SEL_TAB_TASKS,
  [SEL_LEADS]: SEL_TAB_LEADS,
};

function isOnScreen(selector: string): boolean {
  const node = document.querySelector(selector);
  return node instanceof HTMLElement && node.getClientRects().length > 0;
}

function revealReportsStep(stepElement: string, activeDriver: Driver): void {
  const tabSelector = TAB_FOR_STEP[stepElement];
  if (!tabSelector || isOnScreen(stepElement)) return;
  const tab = document.querySelector(tabSelector);
  if (tab instanceof HTMLElement) tab.click();
  window.setTimeout(() => {
    activeDriver.refresh();
  }, 320);
}

function buildReportsSteps(t: TFunction): DriveStep[] {
  return [
    {
      element: SEL_HEADER,
      popover: {
        title: t('tours.reports.header.title'),
        description: t('tours.reports.header.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_TABS,
      popover: {
        title: t('tours.reports.tabs.title'),
        description: t('tours.reports.tabs.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_TARGETS,
      popover: {
        title: t('tours.reports.targets.title'),
        description: t('tours.reports.targets.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_POLICY,
      popover: {
        title: t('tours.reports.policy.title'),
        description: t('tours.reports.policy.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_QUALITY,
      popover: {
        title: t('tours.reports.callQuality.title'),
        description: t('tours.reports.callQuality.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_INSIGHTS,
      popover: {
        title: t('tours.reports.insights.title'),
        description: t('tours.reports.insights.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_TASKS,
      popover: {
        title: t('tours.reports.tasks.title'),
        description: t('tours.reports.tasks.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_LEADS,
      popover: {
        title: t('tours.reports.leadsActivity.title'),
        description: t('tours.reports.leadsActivity.description'),
        side: 'top',
        align: 'center',
      },
    },
  ];
}

function areReportsTargetsReady(): boolean {
  return REQUIRED.every((selector) => document.querySelector(selector) !== null);
}

export function ReportsTour() {
  const { t } = useTranslation('screens');
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { backendUserData } = useSessionSync();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const allowed = canAccessReports(backendUserData?.accessLevel);

  const enabled = useMemo(
    () =>
      Boolean(
        isLoaded && isSignedIn && userId && pathname === '/reports' && allowed && !blockTours
      ),
    [isLoaded, isSignedIn, userId, pathname, allowed, blockTours]
  );

  useMonthlyPageTour({
    enabled,
    userId,
    read: readReportsTourState,
    write: writeReportsTourState,
    areTargetsReady: areReportsTargetsReady,
    getSteps: () => buildReportsSteps(t),
    onHighlight: revealReportsStep,
  });

  return null;
}
