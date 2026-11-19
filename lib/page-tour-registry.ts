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

function featureTour(
  path: string,
  tourId: string,
  copy: {
    header: { title: string; description: string };
    actions?: { title: string; description: string };
    filters?: { title: string; description: string };
    content: { title: string; description: string };
  },
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
  if (copy.actions) {
    steps.push({
      anchor: `${tourId}-actions`,
      titleKey: tourKey(tourId, 'actions', 'title'),
      descriptionKey: tourKey(tourId, 'actions', 'description'),
      side: 'bottom',
      align: 'end',
      optional: true,
    });
  }
  if (copy.filters) {
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
  '/leave': featureTour('/leave', 'leave', {
    header: {
      title: 'Leave',
      description:
        'Request time off, filter the inbox, and approve, reject, or cancel a request.',
    },
    actions: {
      title: 'Request leave',
      description: 'Click Request leave. Choose the type, the dates, and send it for a decision.',
    },
    filters: {
      title: 'Filter the inbox',
      description: 'Narrow by status, person, and date range. Your own requests stay in view when you only see your leave.',
    },
    content: {
      title: 'Open a request',
      description:
        'The chart counts requests by status. Click a row to approve, reject, or cancel it.',
    },
  }),
  '/warnings': featureTour('/warnings', 'warnings', {
    header: {
      title: 'Warnings',
      description: 'Organisation warnings. A warning created on a staff profile also appears here.',
    },
    actions: {
      title: 'Issue warning',
      description: 'Click Issue warning. Record the person, the reason, and the status.',
    },
    filters: {
      title: 'Filter by status',
      description: 'Show every warning, or only one status.',
    },
    content: {
      title: 'Review a warning',
      description: 'Click a row to read it or remove it.',
    },
  }),
  '/documents': featureTour('/documents', 'documents', {
    header: {
      title: 'Documents',
      description: 'List, download, and attach documents to a person.',
    },
    actions: {
      title: 'Attach document',
      description: 'Click Attach document. Upload the file and link it to a person.',
    },
    filters: {
      title: 'Filter by title',
      description: 'Type part of a title to shorten the list.',
    },
    content: {
      title: 'Download a file',
      description: 'Each row is a document. Download it from the row.',
    },
  }),
  '/feedback': featureTour('/feedback', 'feedback', {
    header: {
      title: 'Feedback',
      description: 'The inbox, counts by status, and status updates. Token expiry stays on Settings.',
    },
    filters: {
      title: 'Filter by status',
      description: 'Show all feedback, or only New, In review, Resolved, or Closed.',
    },
    content: {
      title: 'Resolve feedback',
      description: 'The chart counts each status. Click Resolve on a row to mark it resolved.',
    },
  }),
  '/geofences': featureTour('/geofences', 'geofences', {
    header: {
      title: 'Geofences',
      description: 'Create areas and review entry events. The same areas draw on Competitor Overview.',
    },
    actions: {
      title: 'New area',
      description: 'Click New area. Set the name, latitude, longitude, and radius in metres.',
    },
    content: {
      title: 'Open an area',
      description: 'Click a row to edit the area or see how many entry events it recorded.',
    },
  }),
  '/usage': featureTour('/usage', 'usage', {
    header: {
      title: 'Usage',
      description: 'Analytics, summaries, and license usage. The server records the events itself.',
    },
    content: {
      title: 'Read the last 30 days',
      description:
        'The chart is request volume. Under it, the license line shows errors and quota, and the list is requests by endpoint.',
    },
  }),
  '/products': featureTour('/products', 'products', {
    header: {
      title: 'Products',
      description: 'Create, edit, archive, restore, and review catalogue prices.',
    },
    actions: {
      title: 'New product',
      description: 'Click New product. Enter the name and price, then save it to the catalogue.',
    },
    content: {
      title: 'Edit a product',
      description: 'Click a row to change the name or price. Save current prices writes the prices on screen.',
    },
  }),
  '/news': featureTour('/news', 'news', {
    header: {
      title: 'News',
      description: 'Organisation announcements.',
    },
    actions: {
      title: 'New post',
      description: 'Click New post. Write the title and the announcement, then save it.',
    },
    content: {
      title: 'Edit a post',
      description: 'Click a row to change that announcement.',
    },
  }),
  '/sales-tips': featureTour('/sales-tips', 'sales-tips', {
    header: {
      title: 'Sales tips',
      description: 'Edit the catalogue. Home still shows the tip of the day.',
    },
    actions: {
      title: 'New tip',
      description: 'Click New tip. Add a title and the tip text.',
    },
    content: {
      title: 'Edit a tip',
      description: 'Click a row to update that tip.',
    },
  }),
  '/resellers': featureTour('/resellers', 'resellers', {
    header: {
      title: 'Resellers',
      description: 'Add, edit, archive, and restore reseller records.',
    },
    actions: {
      title: 'New reseller',
      description: 'Click New reseller. Start the record with a name, then save the details.',
    },
    content: {
      title: 'Open a reseller',
      description: 'Click a row to edit, archive, or restore that reseller.',
    },
  }),
  '/rewards': featureTour('/rewards', 'rewards', {
    header: {
      title: 'Rewards',
      description: 'The XP leaderboard and a person’s standing.',
    },
    content: {
      title: 'Read the board',
      description: 'The chart is the top of the board. The list under it is each person’s XP.',
    },
  }),
  '/loyalty': featureTour('/loyalty', 'loyalty', {
    header: {
      title: 'Loyalty',
      description: 'Profiles, the reward catalogue, and claim history.',
    },
    content: {
      title: 'Add and claim rewards',
      description:
        'Type a reward name and click Add reward. Claim uses a catalogue reward. The line under the list is transaction and broadcast history.',
    },
  }),
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
        anchor: 'claims-summary',
        titleKey: 'tours.claims.summary.title',
        descriptionKey: 'tours.claims.summary.description',
        side: 'bottom',
        align: 'center',
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
    { required: ['claims-page-header', 'claims-summary', 'claims-toolbar', 'claims-list'] },
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
