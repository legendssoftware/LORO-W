import type { ClientAddress, ClientProfileData } from '@/api/types/client-portal';
import { getQuotationStatusLabel } from '@/lib/order-kanban-utils';

export function formatZar(amount?: number | null): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatAddress(address?: ClientAddress | null): string {
  if (!address) return '—';
  const parts = [
    address.street,
    address.suburb,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

export function getSalesRepName(client: ClientProfileData): string {
  const rep = client.assignedSalesRep;
  if (!rep) return '—';
  return [rep.name, rep.surname].filter(Boolean).join(' ').trim() || '—';
}

export function getCustomField(
  client: ClientProfileData,
  key: string
): string {
  const v = client.customFields?.[key];
  return typeof v === 'string' ? v : '—';
}

export function parseQuotationAmount(value?: number | string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export function formatQuotationStatusLabel(status?: string): string {
  return getQuotationStatusLabel(status ?? 'pending');
}

export function canEditQuotationStatus(status?: string): boolean {
  const s = (status ?? '').toLowerCase();
  const nonEditable = [
    'sourcing',
    'packing',
    'in_fulfillment',
    'delivered',
    'completed',
    'cancelled',
    'approved',
  ];
  return !nonEditable.includes(s);
}

export function quotationStatusClass(status?: string): string {
  const s = (status ?? '').toLowerCase();
  if (s.includes('approved') || s.includes('completed') || s.includes('delivered')) {
    return 'bg-green-100 text-green-800';
  }
  if (s.includes('pending') || s.includes('review') || s.includes('negotiation')) {
    return 'bg-amber-100 text-amber-800';
  }
  if (s.includes('rejected') || s.includes('cancelled')) {
    return 'bg-red-100 text-red-800';
  }
  if (s.includes('sourcing') || s.includes('packing') || s.includes('fulfillment')) {
    return 'bg-blue-100 text-blue-800';
  }
  return 'bg-muted text-muted-foreground';
}
