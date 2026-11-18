'use client';

import type { DriveStep } from 'driver.js';
import { createMonthlyTourStorage } from '@/lib/create-monthly-tour-storage';
import type { TourMonthState } from '@/lib/tour-monthly-persist';

type PopoverSide = 'top' | 'right' | 'bottom' | 'left';
type PopoverAlign = 'start' | 'center' | 'end';

type PageTourStep = {
  anchor: string;
  title: string;
  description: string;
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
      title: copy.header.title,
      description: copy.header.description,
      side: 'bottom',
      align: 'start',
    },
  ];
  if (copy.actions) {
    steps.push({
      anchor: `${tourId}-actions`,
      title: copy.actions.title,
      description: copy.actions.description,
      side: 'bottom',
      align: 'end',
      optional: true,
    });
  }
  if (copy.filters) {
    steps.push({
      anchor: `${tourId}-filters`,
      title: copy.filters.title,
      description: copy.filters.description,
      side: 'bottom',
      align: 'center',
      optional: true,
    });
  }
  steps.push({
    anchor: `${tourId}-content`,
    title: copy.content.title,
    description: copy.content.description,
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
        title: 'Claims',
        description: 'Submit expenses, attach receipts, and track each claim from approval to payment.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'claims-summary',
        title: 'Stage totals',
        description: 'Click Total, Pending, Approved, Declined, or Paid. The list below follows that stage.',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'claims-toolbar',
        title: 'Search, export, and create',
        description:
          'Filter by date, group, currency, or person. Export downloads a spreadsheet. New claim starts a submission.',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'claims-folders',
        title: 'Claim folders',
        description: 'Click a folder to show only the claims in that group.',
        side: 'bottom',
        align: 'start',
        optional: true,
      },
      {
        anchor: 'claims-list',
        title: 'Open a claim',
        description: 'Claims are grouped. Click one to follow the receipt, the decision, and the payment.',
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
        title: 'IoT devices',
        description: 'Connected hardware and access devices, organised by branch.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'iot-toolbar',
        title: 'Filter devices',
        description: 'Filter by status, type, or branch, then search by id, tag, or location.',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'iot-add-device',
        title: 'Add device',
        description: 'Click Add device. Record the hardware and the branch it belongs to.',
        side: 'bottom',
        align: 'end',
      },
      {
        anchor: 'iot-grid',
        title: 'Open a device',
        description: 'Click a card to inspect or edit that device.',
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
        title: 'Approvals',
        description: 'Review pending requests, inspect employee intake forms, and approve or reject from the web.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'approvals-toolbar',
        title: 'Filter and file a request',
        description:
          'Search by title or reference, then filter by status or type. New request files a general request. My requests loads the ones you submitted.',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'approvals-list',
        title: 'Open a request',
        description: 'Click a card to approve or reject it. Intake forms open from the same card.',
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
        title: 'Payslips',
        description: 'View and download your payslip documents.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'payslips-import',
        title: 'Import from storage',
        description: 'Preview the storage import, then confirm it. Only people who can import payslips see this.',
        side: 'bottom',
        align: 'center',
        optional: true,
      },
      {
        anchor: 'payslips-filters',
        title: 'Filter payslips',
        description: 'The list starts as all time. Switch to a date range or a status to narrow it.',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'payslips-table',
        title: 'View or download',
        description: 'View opens the payslip. Download saves the file. Page size under the table sets how many rows load.',
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
        title: 'Competitors',
        description: 'Track rivals, threat levels, and locations alongside your clients.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'competitors-toolbar',
        title: 'Filter and search',
        description: 'Filter by status, direct or indirect, and threat level. Search by name.',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'competitors-add',
        title: 'Add competitor',
        description: 'Click Add competitor, or Import to bring in a spreadsheet. Both land in this grid.',
        side: 'bottom',
        align: 'end',
        optional: true,
      },
      {
        anchor: 'competitors-grid',
        title: 'Open a competitor',
        description: 'Click a card for the threat, the location, and edit or delete when you manage the list.',
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
        title: 'System takeoff',
        description:
          'Measure a ceiling or partition. Quantities are calculated on the server, then issued as a quotation.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'takeoff-create',
        title: 'New takeoff',
        description: 'Click New takeoff. Name the job and the client, then open it to measure.',
        side: 'bottom',
        align: 'end',
      },
      {
        anchor: 'takeoff-list',
        title: 'Open a takeoff',
        description: 'Click a reference to continue measuring and issue the quotation. Status and total stay on this row.',
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
        title: 'Deliveries',
        description:
          'Assign an open ERP sales order to a driver. The signed proof of delivery appears here once the driver records the stop.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'deliveries-toolbar',
        title: 'Filter deliveries',
        description: 'Filter by day, status, driver, or search. Page size under the table sets how many rows load.',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'deliveries-assign',
        title: 'Assign delivery',
        description: 'Click Assign delivery. Pick an open sales order and the driver who will run the stop.',
        side: 'bottom',
        align: 'end',
        optional: true,
      },
      {
        anchor: 'deliveries-list',
        title: 'Open a delivery',
        description: 'Click a row for the route, the rating, and the signed proof of delivery.',
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
        title: 'Store operations',
        description: 'Live branch openings, checklists, and stock counts across every store.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'store-operations-tabs',
        title: 'Overview and details',
        description: 'Overview is the live board. Details is the longer store-by-store list.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'store-operations-filters',
        title: 'Narrow the stores',
        description: 'Filter by country, region, and period. Features opens the extra store-operations tools.',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'store-operations-summary',
        title: 'Click a total',
        description:
          'Each card is a slice of the day: all stores, opened on time, late, missed, closed on time, or checklists completed. Click one to keep only those stores.',
        side: 'bottom',
        align: 'center',
        optional: true,
      },
      {
        anchor: 'store-operations-stores',
        title: 'Store status',
        description: 'Each row is a branch’s opening and checklist right now. Open it for that store’s session.',
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
        title: 'Store',
        description: 'Browse products, add them to your cart, and submit a quotation.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'store-toolbar',
        title: 'Search and cart',
        description: 'Search or filter by category. The cart holds the lines you will send as a quotation.',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'store-catalogue',
        title: 'Add a product',
        description: 'Click a product to add it to the cart. Load more brings the next page of the catalogue.',
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
        title: 'Orders',
        description: 'Track quotations and orders by status.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'orders-new',
        title: 'New order',
        description: 'Click New Order. That opens the store so you can build the next quotation.',
        side: 'bottom',
        align: 'end',
      },
      {
        anchor: 'orders-board',
        title: 'Open an order',
        description: 'Columns are the quotation and order statuses. Click a card for the detail.',
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
        title: 'Projects',
        description: 'Manage your projects, create new ones, and track their progress.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'projects-create',
        title: 'Create project',
        description: 'Click Create project. Name it, then it appears in this grid.',
        side: 'bottom',
        align: 'end',
      },
      {
        anchor: 'projects-filters',
        title: 'Filter projects',
        description: 'Search by name or description, or keep one status.',
        side: 'bottom',
        align: 'center',
      },
      {
        anchor: 'projects-grid',
        title: 'Open a project',
        description: 'Click a card for progress and the project detail.',
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
        title: 'Account',
        description: 'Your company profile, credit, and contact details.',
        side: 'bottom',
        align: 'start',
      },
      {
        anchor: 'account-edit',
        title: 'Edit profile',
        description: 'Click Edit profile to change the company details. View profile returns to the read-only cards.',
        side: 'bottom',
        align: 'end',
      },
      {
        anchor: 'account-profile',
        title: 'Company snapshot',
        description: 'Name, contact, address, credit limit, and the sales rep assigned to you.',
        side: 'top',
        align: 'center',
      },
      {
        anchor: 'account-details',
        title: 'Company details',
        description: 'Company, contact, and commercial fields. Edit profile turns this into the form.',
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

export function buildPageTourSteps(config: PageTourConfig): DriveStep[] {
  return config.steps
    .filter((step) => !step.optional || document.querySelector(anchor(step.anchor)) !== null)
    .map((step) => ({
      element: anchor(step.anchor),
      popover: {
        title: step.title,
        description: step.description,
        side: step.side ?? 'bottom',
        align: step.align ?? 'start',
      },
    }));
}
