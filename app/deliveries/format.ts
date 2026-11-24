import type {
  DeliveryCancellationReason,
  DeliveryCancellationSide,
  DeliveryException,
  DeliveryStatus,
} from '@/api/types/epod';

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  assigned: 'Assigned',
  in_progress: 'In progress',
  recorded: 'Recorded',
  cancelled: 'Cancelled',
};

const EXCEPTION_LABELS: Record<DeliveryException, string> = {
  none: 'None',
  short_quantity: 'Short quantity',
  damaged: 'Damaged goods',
  customer_rejected: 'Customer rejected',
};

const CANCELLATION_SIDE_LABELS: Record<DeliveryCancellationSide, string> = {
  customer: 'Customer',
  driver: 'Driver',
};

const CANCELLATION_REASON_LABELS: Record<DeliveryCancellationReason, string> = {
  customer_not_available: 'Customer not available',
  customer_refused: 'Customer refused delivery',
  customer_wrong_address: 'Wrong or incomplete address',
  customer_rescheduled: 'Customer asked to reschedule',
  customer_other: 'Other (type reason)',
  driver_vehicle_issue: 'Vehicle or breakdown issue',
  driver_safety: 'Site or safety concern',
  driver_time_constraint: 'Could not complete in time',
  driver_goods_issue: 'Goods missing, damaged, or incomplete',
  driver_other: 'Other (type reason)',
};

export function formatDeliveryStatus(status: DeliveryStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatDeliveryException(exception: DeliveryException | null): string {
  if (!exception) return '—';
  return EXCEPTION_LABELS[exception] ?? exception;
}

export function formatCancellationSide(side: DeliveryCancellationSide): string {
  return CANCELLATION_SIDE_LABELS[side] ?? side;
}

export function formatCancellationReason(reason: DeliveryCancellationReason): string {
  return CANCELLATION_REASON_LABELS[reason] ?? reason;
}

/** Arrival window in the branch timezone, or the scheduled day when no clock time exists. */
export function formatArrivalWindow(
  start: string | null | undefined,
  end: string | null | undefined,
  scheduledDate: string,
): string {
  if (!start || !end) return scheduledDate || '—';
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return scheduledDate || '—';
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(startDate);
  const clock = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Johannesburg',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${day}, ${clock.format(startDate)} - ${clock.format(endDate)}`;
}

/** Pill colors that stay readable on the dark deliveries table. */
export function deliveryStatusClassName(status: DeliveryStatus): string {
  switch (status) {
    case 'assigned':
      return 'border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-200';
    case 'in_progress':
      return 'border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200';
    case 'recorded':
      return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200';
    case 'cancelled':
      return 'border-red-500/40 bg-red-500/15 text-red-800 dark:text-red-200';
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

/** Amber outline for the Mark loaded action (warehouse load still needed). */
export const markLoadedButtonClassName =
  'gap-1.5 border-amber-500/50 bg-amber-500/15 text-amber-950 hover:bg-amber-500/25 hover:text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/30 dark:hover:text-amber-50';

/** Green disabled button once dispatch has Marked loaded. */
export const loadedReadyButtonClassName =
  'gap-1.5 border-emerald-500/50 bg-emerald-500/15 text-emerald-800 opacity-100 disabled:opacity-100 disabled:border-emerald-500/50 disabled:bg-emerald-500/15 disabled:text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200 dark:disabled:border-emerald-400/40 dark:disabled:bg-emerald-500/20 dark:disabled:text-emerald-200';

/** `-25.995, 28.123` for a captured GPS pair, or an em dash when the stop has none. */
export function formatCoordinates(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return '—';
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

/** Local date and time for an ISO timestamp from the API. */
export function formatDeliveryTimestamp(value: string | null): string {
  if (!value?.trim()) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Today's date as `YYYY-MM-DD` in the dispatcher's own timezone. */
export function todayDateString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
