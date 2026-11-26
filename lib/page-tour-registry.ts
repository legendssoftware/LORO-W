'use client';

import type { DriveStep } from 'driver.js';
import type { TFunction } from 'i18next';
import { createMonthlyTourStorage } from '@/lib/create-monthly-tour-storage';
import type { TourMonthState } from '@/lib/tour-monthly-persist';

type PopoverSide = 'top' | 'right' | 'bottom' | 'left';
type PopoverAlign = 'start' | 'center' | 'end';

type PageTourStep = {
  anchor: string;
  /** screens catalog key, for example `tours.leave.header.title`. */
  titleKey: string;
  descriptionKey: string;
  side?: PopoverSide;
  align?: PopoverAlign;
  /** Included only when the anchor is in the document at start. */
  optional?: boolean;
};

export type PageTourConfig = {
  path: string;
  read: (userId: string) => TourMonthState | null;
  write: (userId: string, state: TourMonthState) => void;
  /** Tour waits until every one of these anchors exists. */
  required: readonly string[];
  /** Tour also waits until any one of these exists. Use for content that appears after loading. */
  settled?: readonly string[];
  steps: readonly PageTourStep[];
};

function anchor(id: string): string {
  return `[data-tour="${id}"]`;
}

function defineTour(
  path: string,
  storagePrefix: string,
  steps: readonly PageTourStep[],
  options?: { required?: readonly string[]; settled?: readonly string[] },
): PageTourConfig {
  const storage = createMonthlyTourStorage(storagePrefix);
  const required = options?.required ?? [steps[0]?.anchor ?? ''];
  return {
    path,
    read: storage.read,
    write: storage.write,
    required: required.map(anchor),
    settled: options?.settled?.map(anchor),
    steps,
  };
}

function tourKey(tourId: string, slot: string, field: 'title' | 'description'): string {
  return `tours.${tourId}.${slot}.${field}`;
}

/** Display copy lives in `tours.${tourId}.*` (screens.json). Options only toggle optional steps. */
function featureTour(
  path: string,
  tourId: string,
  options?: { actions?: boolean; filters?: boolean },
): PageTourConfig {
  const steps: PageTourStep[] = [
    {
      anchor: `${tourId}-page-header`,
      titleKey: tourKey(tourId, 'header', 'title'),
      descriptionKey: tourKey(tourId, 'header', 'description'),
      side: 'bottom',
      align: 'start',
    },
  ];
  if (options?.actions) {
    steps.push({
      anchor: `${tourId}-actions`,
      titleKey: tourKey(tourId, 'actions', 'title'),
      descriptionKey: tourKey(tourId, 'actions', 'description'),
      side: 'bottom',
      align: 'end',
      optional: true,
    });
  }
  if (options?.filters) {
    steps.push({
      anchor: `${tourId}-filters`,
      titleKey: tourKey(tourId, 'filters', 'title'),
      descriptionKey: tourKey(tourId, 'filters', 'description'),
      side: 'bottom',
      align: 'center',
      optional: true,
    });
  }
  steps.push({
    anchor: `${tourId}-content`,
    titleKey: tourKey(tourId, 'content', 'title'),
    descriptionKey: tourKey(tourId, 'content', 'description'),
    side: 'top',
    align: 'center',
    optional: true,
  });

  return defineTour(path, `loro-page-tour-${tourId}-v1`, steps, {
    required: [`${tourId}-page-header`],
    settled: [`${tourId}-content`, `${tourId}-settled`],
  });
}

const PAGE_TOURS: Record<string, PageTourConfig> = {
  '/leave': featureTour('/leave', 'leave', { actions: true, filters: true }),
  '/warnings': featureTour('/warnings', 'warnings', { actions: true, filters: true }),
  '/documents': featureTour('/documents', 'documents', { actions: true, filters: true }),
  '/feedback': featureTour('/feedback', 'feedback', { filters: true }),
  '/geofences': featureTour('/geofences', 'geofences', { actions: true }),
  '/usage': featureTour('/usage', 'usage'),
  '/products': featureTour('/products', 'products', { actions: true }),
  '/news': featureTour('/news', 'news', { actions: true }),
  '/sales-tips': featureTour('/sales-tips', 'sales-tips', { actions: true }),
  '/resellers': featureTour('/resellers', 'resellers', { actions: true }),
  '/rewards': featureTour('/rewards', 'rewards'),
  '/loyalty': featureTour('/loyalty', 'loyalty'),
  '/claims': defineTour(
    '/claims',
    'loro-page-tour-claims-v1',
    [
      {
        anchor: 'claims-page-header',
        titleKey: 'tours.claims.header.title',
        descriptionKey: 'tours.claims.header.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'claims-toolbar',
        titleKey: 'tours.claims.toolbar.title',
        descriptionKey: 'tours.claims.toolbar.description',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'claims-folders',
        titleKey: 'tours.claims.folders.title',
        descriptionKey: 'tours.claims.folders.description',
        side: 'bottom',
        align: 'start',
        optional: true,
      },
      {
        anchor: 'claims-list',
        titleKey: 'tours.claims.list.title',
        descriptionKey: 'tours.claims.list.description',
        side: 'top',
        align: 'center',
      },
    ],
    { required: ['claims-page-header', 'claims-toolbar', 'claims-list'] },
  ),
  '/iot': defineTour(
    '/iot',
    'loro-page-tour-iot-v1',
    [
      {
        anchor: 'iot-page-header',
        titleKey: 'tours.iot.header.title',
        descriptionKey: 'tours.iot.header.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'iot-toolbar',
        titleKey: 'tours.iot.toolbar.title',
        descriptionKey: 'tours.iot.toolbar.description',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'iot-add-device',
        titleKey: 'tours.iot.add.title',
        descriptionKey: 'tours.iot.add.description',
        side: 'bottom',
        align: 'end',
      },
      {
        anchor: 'iot-grid',
        titleKey: 'tours.iot.grid.title',
        descriptionKey: 'tours.iot.grid.description',
        side: 'top',
        align: 'center',
      },
    ],
    { required: ['iot-page-header', 'iot-toolbar', 'iot-add-device', 'iot-grid'] },
  ),
  '/approvals': defineTour(
    '/approvals',
    'loro-page-tour-approvals-v1',
    [
      {
        anchor: 'approvals-page-header',
        titleKey: 'tours.approvals.header.title',
        descriptionKey: 'tours.approvals.header.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'approvals-toolbar',
        titleKey: 'tours.approvals.toolbar.title',
        descriptionKey: 'tours.approvals.toolbar.description',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'approvals-list',
        titleKey: 'tours.approvals.list.title',
        descriptionKey: 'tours.approvals.list.description',
        side: 'top',
        align: 'center',
      },
    ],
    {
      required: ['approvals-page-header', 'approvals-toolbar'],
      settled: ['approvals-list', 'approvals-settled'],
    },
  ),
  '/payslips': defineTour(
    '/payslips',
    'loro-page-tour-payslips-v1',
    [
      {
        anchor: 'payslips-page-header',
        titleKey: 'tours.payslips.header.title',
        descriptionKey: 'tours.payslips.header.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'payslips-import',
        titleKey: 'tours.payslips.import.title',
        descriptionKey: 'tours.payslips.import.description',
        side: 'bottom',
        align: 'center',
        optional: true,
      },
      {
        anchor: 'payslips-filters',
        titleKey: 'tours.payslips.filters.title',
        descriptionKey: 'tours.payslips.filters.description',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'payslips-table',
        titleKey: 'tours.payslips.table.title',
        descriptionKey: 'tours.payslips.table.description',
        side: 'top',
        align: 'center',
      },
    ],
    { required: ['payslips-page-header', 'payslips-filters', 'payslips-table'] },
  ),
  '/competitors': defineTour(
    '/competitors',
    'loro-page-tour-competitors-v1',
    [
      {
        anchor: 'competitors-page-header',
        titleKey: 'tours.competitors.header.title',
        descriptionKey: 'tours.competitors.header.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'competitors-toolbar',
        titleKey: 'tours.competitors.toolbar.title',
        descriptionKey: 'tours.competitors.toolbar.description',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'competitors-add',
        titleKey: 'tours.competitors.add.title',
        descriptionKey: 'tours.competitors.add.description',
        side: 'bottom',
        align: 'end',
        optional: true,
      },
      {
        anchor: 'competitors-grid',
        titleKey: 'tours.competitors.grid.title',
        descriptionKey: 'tours.competitors.grid.description',
        side: 'top',
        align: 'center',
      },
    ],
    { required: ['competitors-page-header', 'competitors-toolbar', 'competitors-grid'] },
  ),
  '/takeoff': defineTour(
    '/takeoff',
    'loro-page-tour-takeoff-v1',
    [
      {
        anchor: 'takeoff-page-header',
        titleKey: 'tours.takeoff.header.title',
        descriptionKey: 'tours.takeoff.header.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'takeoff-create',
        titleKey: 'tours.takeoff.create.title',
        descriptionKey: 'tours.takeoff.create.description',
        side: 'bottom',
        align: 'end',
      },
      {
        anchor: 'takeoff-list',
        titleKey: 'tours.takeoff.list.title',
        descriptionKey: 'tours.takeoff.list.description',
        side: 'top',
        align: 'center',
      },
    ],
    { required: ['takeoff-page-header', 'takeoff-create', 'takeoff-list'] },
  ),
  '/deliveries': defineTour(
    '/deliveries',
    'loro-page-tour-deliveries-v1',
    [
      {
        anchor: 'deliveries-page-header',
        titleKey: 'tours.deliveries.header.title',
        descriptionKey: 'tours.deliveries.header.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'deliveries-toolbar',
        titleKey: 'tours.deliveries.toolbar.title',
        descriptionKey: 'tours.deliveries.toolbar.description',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'deliveries-assign',
        titleKey: 'tours.deliveries.assign.title',
        descriptionKey: 'tours.deliveries.assign.description',
        side: 'bottom',
        align: 'end',
        optional: true,
      },
      {
        anchor: 'deliveries-list',
        titleKey: 'tours.deliveries.list.title',
        descriptionKey: 'tours.deliveries.list.description',
        side: 'top',
        align: 'center',
      },
    ],
    { required: ['deliveries-page-header', 'deliveries-toolbar', 'deliveries-list'] },
  ),
  '/store-operations': defineTour(
    '/store-operations',
    'loro-page-tour-store-operations-v1',
    [
      {
        anchor: 'store-operations-page-header',
        titleKey: 'tours.store-operations.header.title',
        descriptionKey: 'tours.store-operations.header.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'store-operations-tabs',
        titleKey: 'tours.store-operations.tabs.title',
        descriptionKey: 'tours.store-operations.tabs.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'store-operations-filters',
        titleKey: 'tours.store-operations.filters.title',
        descriptionKey: 'tours.store-operations.filters.description',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'store-operations-summary',
        titleKey: 'tours.store-operations.summary.title',
        descriptionKey: 'tours.store-operations.summary.description',
        side: 'bottom',
        align: 'center',
        optional: true,
      },
      {
        anchor: 'store-operations-stores',
        titleKey: 'tours.store-operations.stores.title',
        descriptionKey: 'tours.store-operations.stores.description',
        side: 'top',
        align: 'center',
        optional: true,
      },
    ],
    {
      required: ['store-operations-page-header', 'store-operations-tabs', 'store-operations-filters'],
      settled: ['store-operations-settled'],
    },
  ),
  '/store': defineTour(
    '/store',
    'loro-page-tour-store-v1',
    [
      {
        anchor: 'store-page-header',
        titleKey: 'tours.store.header.title',
        descriptionKey: 'tours.store.header.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'store-toolbar',
        titleKey: 'tours.store.toolbar.title',
        descriptionKey: 'tours.store.toolbar.description',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'store-catalogue',
        titleKey: 'tours.store.catalogue.title',
        descriptionKey: 'tours.store.catalogue.description',
        side: 'top',
        align: 'center',
      },
    ],
    { required: ['store-page-header', 'store-toolbar', 'store-catalogue'] },
  ),
  '/orders': defineTour(
    '/orders',
    'loro-page-tour-orders-v1',
    [
      {
        anchor: 'orders-page-header',
        titleKey: 'tours.orders.header.title',
        descriptionKey: 'tours.orders.header.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'orders-new',
        titleKey: 'tours.orders.create.title',
        descriptionKey: 'tours.orders.create.description',
        side: 'bottom',
        align: 'end',
      },
      {
        anchor: 'orders-board',
        titleKey: 'tours.orders.board.title',
        descriptionKey: 'tours.orders.board.description',
        side: 'top',
        align: 'center',
      },
    ],
    {
      required: ['orders-page-header', 'orders-new'],
      settled: ['orders-board'],
    },
  ),
  '/projects': defineTour(
    '/projects',
    'loro-page-tour-projects-v1',
    [
      {
        anchor: 'projects-page-header',
        titleKey: 'tours.projects.header.title',
        descriptionKey: 'tours.projects.header.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'projects-create',
        titleKey: 'tours.projects.create.title',
        descriptionKey: 'tours.projects.create.description',
        side: 'bottom',
        align: 'end',
      },
      {
        anchor: 'projects-filters',
        titleKey: 'tours.projects.filters.title',
        descriptionKey: 'tours.projects.filters.description',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'projects-grid',
        titleKey: 'tours.projects.grid.title',
        descriptionKey: 'tours.projects.grid.description',
        side: 'top',
        align: 'center',
      },
    ],
    { required: ['projects-page-header', 'projects-create', 'projects-filters', 'projects-grid'] },
  ),
  '/account': defineTour(
    '/account',
    'loro-page-tour-account-v1',
    [
      {
        anchor: 'account-page-header',
        titleKey: 'tours.account.header.title',
        descriptionKey: 'tours.account.header.description',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'account-edit',
        titleKey: 'tours.account.edit.title',
        descriptionKey: 'tours.account.edit.description',
        side: 'bottom',
        align: 'end',
      },
      {
        anchor: 'account-profile',
        titleKey: 'tours.account.profile.title',
        descriptionKey: 'tours.account.profile.description',
        side: 'top',
        align: 'center',
      },
      {
        anchor: 'account-details',
        titleKey: 'tours.account.details.title',
        descriptionKey: 'tours.account.details.description',
        side: 'top',
        align: 'center',
        optional: true,
      },
    ],
    {
      required: ['account-page-header', 'account-edit'],
      settled: ['account-profile'],
    },
  ),
};

export function getPageTour(pathname: string): PageTourConfig | undefined {
  return PAGE_TOURS[pathname];
}

export function hasRegistryPageTour(pathname: string): boolean {
  return Object.prototype.hasOwnProperty.call(PAGE_TOURS, pathname);
}

export function arePageTourTargetsReady(config: PageTourConfig): boolean {
  const requiredReady = config.required.every((selector) => document.querySelector(selector) !== null);
  if (!requiredReady) return false;
  if (!config.settled || config.settled.length === 0) return true;
  return config.settled.some((selector) => document.querySelector(selector) !== null);
}

export function buildPageTourSteps(config: PageTourConfig, t: TFunction): DriveStep[] {
  return config.steps
    .filter((step) => !step.optional || document.querySelector(anchor(step.anchor)) !== null)
    .map((step) => ({
      element: anchor(step.anchor),
      popover: {
        title: t(step.titleKey),
        description: t(step.descriptionKey),
        side: step.side ?? 'bottom',
        align: step.align ?? 'start',
      },
    }));
}
