'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { tourButtonLabels } from '@/lib/use-monthly-page-tour';
import type { TFunction } from 'i18next';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { canAccessOrgSettings } from '@/lib/access';
import {
  getCurrentYearMonth,
  readSettingsTourState,
  writeSettingsTourState,
} from '@/lib/settings-tour-storage';
import { persistAfterDriverDestroyed } from '@/lib/tour-monthly-persist';
import { scheduleTourWhenReady } from '@/lib/schedule-tour-when-ready';
import { usePerformanceWarningPendingSafe } from '@/contexts/performance-warning-pending-context';

const DRIVER_TOUR_POPOVER_CLASS = 'loro-driver-tour';

const SEL_ACTIONS = '[data-tour="settings-panel-actions"]';
const SEL_LANGUAGE = '[data-tour="settings-language"]';
const SEL_TAB_PROFILE = '[data-tour="settings-tab-profile"]';
const SEL_TAB_REGIONAL = '[data-tour="settings-tab-regional"]';

const TAB_FOR_STEP: Record<string, string> = {
  [SEL_ACTIONS]: SEL_TAB_PROFILE,
  [SEL_LANGUAGE]: SEL_TAB_REGIONAL,
};

function isOnScreen(selector: string): boolean {
  const node = document.querySelector(selector);
  return node instanceof HTMLElement && node.getClientRects().length > 0;
}

function revealSettingsStep(stepElement: string, activeDriver: Driver): void {
  const tabSelector = TAB_FOR_STEP[stepElement];
  if (!tabSelector || isOnScreen(stepElement)) return;
  const tab = document.querySelector(tabSelector);
  if (tab instanceof HTMLElement) tab.click();
  window.setTimeout(() => {
    activeDriver.refresh();
  }, 320);
}

function buildTourSteps(t: TFunction): DriveStep[] {
  return [
    {
      element: '[data-tour="settings-page-header"]',
      popover: {
        title: t('tours.settings.header.title'),
        description: t('tours.settings.header.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="settings-tab-nav"]',
      popover: {
        title: t('tours.settings.tab-nav.title'),
        description: t('tours.settings.tab-nav.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="settings-active-panel"]',
      popover: {
        title: t('tours.settings.active-panel.title'),
        description: t('tours.settings.active-panel.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: SEL_ACTIONS,
      popover: {
        title: t('tours.settings.panel-actions.title'),
        description: t('tours.settings.panel-actions.description'),
        side: 'top',
        align: 'end',
      },
    },
    {
      element: SEL_LANGUAGE,
      popover: {
        title: t('tours.settings.language.title'),
        description: t('tours.settings.language.description'),
        side: 'bottom',
        align: 'start',
      },
    },
  ];
}

function areTourTargetsReady(steps: DriveStep[]): boolean {
  return steps.every((step) => {
    if (typeof step.element !== 'string') return true;
    if (step.element === SEL_LANGUAGE || step.element === SEL_ACTIONS) return true;
    return document.querySelector(step.element) !== null;
  });
}

export function SettingsTour() {
  const { t } = useTranslation('screens');
  const { t: tCommon } = useTranslation('common');
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { backendUserData } = useSessionSync();
  const canManageOrgSettings = canAccessOrgSettings(backendUserData?.accessLevel);
  const blockTours = usePerformanceWarningPendingSafe().deferToursAndSalesBenchmarks;
  const driverRef = useRef<Driver | null>(null);
  const hasAttemptedStartRef = useRef(false);
  const wasCompletedRef = useRef(false);
  const programmaticDestroyRef = useRef(false);

  const shouldRun = useMemo(
    () =>
      Boolean(
        isLoaded &&
          isSignedIn &&
          userId &&
          pathname === '/settings' &&
          canManageOrgSettings
      ),
    [isLoaded, isSignedIn, userId, pathname, canManageOrgSettings]
  );

  useEffect(() => {
    if (!shouldRun || !userId) {
      hasAttemptedStartRef.current = false;
      wasCompletedRef.current = false;
      programmaticDestroyRef.current = true;
      try {
        driverRef.current?.destroy();
      } finally {
        programmaticDestroyRef.current = false;
      }
      driverRef.current = null;
      return;
    }
    if (blockTours) {
      hasAttemptedStartRef.current = false;
      programmaticDestroyRef.current = true;
      try {
        driverRef.current?.destroy();
      } finally {
        programmaticDestroyRef.current = false;
      }
      driverRef.current = null;
      return;
    }
    if (hasAttemptedStartRef.current) return;
    hasAttemptedStartRef.current = true;

    const period = getCurrentYearMonth();
    const stored = readSettingsTourState(userId);
    const currentState = stored ?? {
      period,
      resumeIndex: 0,
      completedThisMonth: false,
    };

    if (currentState.period !== period) {
      currentState.period = period;
      currentState.resumeIndex = 0;
      currentState.completedThisMonth = false;
    }

    if (currentState.completedThisMonth) return;

    const cancelSchedule = scheduleTourWhenReady({
      areTargetsReady: () => areTourTargetsReady(buildTourSteps(t)),
      onReady: () => {
        const steps = buildTourSteps(t);
        const boundedStartIndex = Math.min(
          Math.max(0, currentState.resumeIndex),
          steps.length - 1
        );

        writeSettingsTourState(userId, {
          period,
          resumeIndex: boundedStartIndex,
          completedThisMonth: false,
        });

        const driverObj = driver({
          showProgress: true,
          smoothScroll: true,
          allowClose: true,
          popoverClass: DRIVER_TOUR_POPOVER_CLASS,
          ...tourButtonLabels(tCommon),
          steps,
          onHighlighted: (_element, _step, { driver: activeDriver }) => {
            const step = activeDriver.getActiveStep();
            const stepElement = typeof step?.element === 'string' ? step.element : '';
            revealSettingsStep(stepElement, activeDriver);
            const activeIndex = activeDriver.getActiveIndex() ?? 0;
            writeSettingsTourState(userId, {
              period: getCurrentYearMonth(),
              resumeIndex: activeIndex,
              completedThisMonth: false,
            });
          },
          onNextClick: (_element, _step, { driver: activeDriver }) => {
            if (activeDriver.isLastStep()) {
              wasCompletedRef.current = true;
              activeDriver.destroy();
              return;
            }
            activeDriver.moveNext();
          },
          onPrevClick: (_element, _step, { driver: activeDriver }) => {
            activeDriver.movePrevious();
          },
          onCloseClick: (_element, _step, { driver: activeDriver }) => {
            activeDriver.destroy();
          },
          onDestroyed: (_element, _step, { driver: activeDriver }) => {
            persistAfterDriverDestroyed({
              userId,
              write: writeSettingsTourState,
              boundedStartIndex,
              getActiveIndex: () => activeDriver.getActiveIndex(),
              wasCompletedRef,
              programmaticDestroyRef,
            });
          },
        });

        driverRef.current = driverObj;
        driverObj.drive(boundedStartIndex);
      },
    });

    return () => {
      cancelSchedule();
      programmaticDestroyRef.current = true;
      try {
        driverRef.current?.destroy();
      } finally {
        programmaticDestroyRef.current = false;
      }
      driverRef.current = null;
      wasCompletedRef.current = false;
    };
  }, [shouldRun, userId, blockTours, t]);

  return null;
}
