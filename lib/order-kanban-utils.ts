import type { ClientQuotation } from '@/api/types/client-portal';
import { QUOTATION_STATUS_OPTIONS } from '@/lib/visit-form-utils';

export const CLIENT_ORDER_KANBAN_COLUMNS = QUOTATION_STATUS_OPTIONS.filter(
  (o) => o.value !== '_none'
);

const KNOWN_STATUS_VALUES = new Set(
  CLIENT_ORDER_KANBAN_COLUMNS.map((o) => o.value.toLowerCase())
);

export const OTHER_KANBAN_COLUMN = {
  value: 'other',
  label: 'Other',
} as const;

export function normalizeQuotationStatus(status?: string): string {
  const s = (status ?? 'pending').trim().toLowerCase();
  return s || 'pending';
}

export function getQuotationStatusLabel(status: string): string {
  const normalized = normalizeQuotationStatus(status);
  if (normalized === OTHER_KANBAN_COLUMN.value) {
    return OTHER_KANBAN_COLUMN.label;
  }
  const match = CLIENT_ORDER_KANBAN_COLUMNS.find((o) => o.value === normalized);
  if (match) return match.label;
  return normalized.replace(/_/g, ' ');
}

export function getKanbanColumnKey(status?: string): string {
  const normalized = normalizeQuotationStatus(status);
  return KNOWN_STATUS_VALUES.has(normalized)
    ? normalized
    : OTHER_KANBAN_COLUMN.value;
}

export function groupQuotationsByKanbanColumn(
  quotations: ClientQuotation[]
): Map<string, ClientQuotation[]> {
  const grouped = new Map<string, ClientQuotation[]>();

  for (const col of CLIENT_ORDER_KANBAN_COLUMNS) {
    grouped.set(col.value, []);
  }
  grouped.set(OTHER_KANBAN_COLUMN.value, []);

  for (const q of quotations) {
    const key = getKanbanColumnKey(q.status);
    const list = grouped.get(key) ?? grouped.get(OTHER_KANBAN_COLUMN.value)!;
    list.push(q);
  }

  return grouped;
}
