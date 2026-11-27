'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { DriveStep, Driver } from 'driver.js';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { canAccessWellbeingDashboard } from '@/lib/access';
import { readWellbeingTourState, writeWellbeingTourState } from '@/lib/wellbeing-tour-storage';
import { useMonthlyPageTour } from '@/lib/use-monthly-page-tour';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const SEL_HEADER = '[data-tour="wellbeing-page-header"]';
const SEL_TOOLBAR = '[data-tour="wellbeing-toolbar"]';
const SEL_TABS = '[data-tour="wellbeing-tabs"]';
const SEL_TODAY = '[data-tour="wellbeing-today"]';
const SEL_INSIGHTS = '[data-tour="wellbeing-insights"]';
const SEL_RADIAL = '[data-tour="wellbeing-radial"]';
const SEL_CORRELATIONS = '[data-tour="wellbeing-correlations"]';
const SEL_ADMIN = '[data-tour="wellbeing-admin"]';
const SEL_TAB_INSIGHTS = '[data-tour="wellbeing-tab-insights"]';
const SEL_TAB_EXECUTIVE = '[data-tour="wellbeing-tab-executive"]';
const SEL_TAB_CORRELATIONS = '[data-tour="wellbeing-tab-correlations"]';
const SEL_TAB_ADMIN = '[data-tour="wellbeing-tab-admin"]';

const REQUIRED = [SEL_HEADER, SEL_TOOLBAR, SEL_TABS, SEL_TODAY] as const;

function isOnScreen(selector: string): boolean {
  const node = document.querySelector(selector);
  return node instanceof HTMLElement && node.getClientRects().length > 0;
}

const TAB_FOR_STEP: Record<string, string> = {
  [SEL_INSIGHTS]: SEL_TAB_INSIGHTS,
  [SEL_RADIAL]: SEL_TAB_EXECUTIVE,
  [SEL_CORRELATIONS]: SEL_TAB_CORRELATIONS,
  [SEL_ADMIN]: SEL_TAB_ADMIN,
};

function revealWellbeingStep(stepElement: string, activeDriver: Driver): void {
  const tabSelector = TAB_FOR_STEP[stepElement];
  if (!tabSelector || isOnScreen(stepElement)) return;
  const tab = document.querySelector(tabSelector);
  if (tab instanceof HTMLElement) tab.click();
  window.setTimeout(() => {
    activeDriver.refresh();
  }, 320);
}

function buildWellbeingSteps(t: TFunction): DriveStep[] {
  return [
    {
      element: SEL_HEADER,
      popover: {
        title: t('tours.wellbeing.header.title'),
        description: t('tours.wellbeing.header.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_TOOLBAR,
      popover: {
        title: t('tours.wellbeing.filters.title'),
        description: t('tours.wellbeing.filters.description'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: SEL_TABS,
      popover: {
        title: t('tours.wellbeing.tabs.title'),
        description: t('tours.wellbeing.tabs.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: SEL_TODAY,
      popover: {
        title: t('tours.wellbeing.today.title'),
        description: t('tours.wellbeing.today.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_INSIGHTS,
      popover: {
        title: t('tours.wellbeing.insights.title'),
        description: t('tours.wellbeing.insights.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_RADIAL,
      popover: {
        title: t('tours.wellbeing.executive.title'),
        description: t('tours.wellbeing.executive.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_CORRELATIONS,
      popover: {
        title: t('tours.wellbeing.correlations.title'),
        description: t('tours.wellbeing.correlations.description'),
        side: 'top',
        align: 'center',
      },
    },
  ];
}

function withOptionalAdminStep(t: TFunction, steps: DriveStep[]): DriveStep[] {
  if (document.querySelector(SEL_TAB_ADMIN) === null) return steps;
  return [
    ...steps,
    {
      element: SEL_ADMIN,
      popover: {
        title: t('tours.wellbeing.admin.title'),
        description: t('tours.wellbeing.admin.description'),
        side: 'top',
        align: 'center',
      },
    },
  ];
}

function areWellbeingTargetsReady(): boolean {
  return REQUIRED.every((selector) => document.querySelector(selector) !== null);
}

export function WellbeingTour() {
  const { t } = useTranslation('screens');
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { backendUserData } = useSessionSync();
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const allowed = canAccessWellbeingDashboard(backendUserData?.accessLevel);

  const enabled = useMemo(
    () =>
      Boolean(
        isLoaded &&
          isSignedIn &&
          userId &&
          pathname === '/wellbeing' &&
          allowed &&
          !blockTours
      ),
    [isLoaded, isSignedIn, userId, pathname, allowed, blockTours]
  );

  useMonthlyPageTour({
    enabled,
    userId,
    read: readWellbeingTourState,
    write: writeWellbeingTourState,
    areTargetsReady: areWellbeingTargetsReady,
    getSteps: () => withOptionalAdminStep(t, buildWellbeingSteps(t)),
    onHighlight: revealWellbeingStep,
  });

  return null;
}
