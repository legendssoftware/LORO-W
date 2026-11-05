import type { DeliveryException, DeliveryStatus } from '@/api/types/epod';

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

export function formatDeliveryStatus(status: DeliveryStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatDeliveryException(exception: DeliveryException | null): string {
  if (!exception) return '—';
  return EXCEPTION_LABELS[exception] ?? exception;
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
