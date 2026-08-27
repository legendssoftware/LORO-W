import type { Approval } from '@/api/types/approvals';

export function coerceApprovalAmount(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatApprovalAmount(amount: unknown, currency?: string): string | undefined {
  const parsed = coerceApprovalAmount(amount);
  if (parsed == null) return undefined;
  const code = currency?.trim() || 'ZAR';
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: code,
    }).format(parsed);
  } catch {
    return `${code} ${parsed}`;
  }
}

export function approvalStatusClassName(status?: string): string {
  const value = String(status ?? '').toLowerCase();
  if (value === 'approved') return 'border-transparent bg-emerald-600 text-white';
  if (value === 'pending' || value === 'under_review' || value === 'submitted') {
    return 'border-transparent bg-blue-100 text-blue-700';
  }
  if (value === 'rejected' || value === 'declined') {
    return 'border-transparent bg-red-600 text-white';
  }
  return 'border-border bg-secondary text-secondary-foreground';
}

export function approvalPriorityClassName(priority?: string): string {
  const value = String(priority ?? '').toLowerCase();
  if (value === 'critical' || value === 'urgent') {
    return 'border-transparent bg-red-100 text-red-700';
  }
  if (value === 'high') return 'border-transparent bg-orange-100 text-orange-800';
  return 'border-border bg-blue-50 text-blue-700';
}

export function sourceLinkLabel(entityType?: string): string {
  const type = String(entityType ?? '').toLowerCase();
  if (type === 'user') return 'Open employee record';
  if (type === 'claim') return 'Open claim';
  if (type === 'client_profile' || type === 'client_credit_limit' || type === 'client') {
    return 'Open client';
  }
  return 'Open source record';
}

export function getApprovalSourceHref(approval: {
  sourceItem?: { href?: string; entityType?: string };
  entityType?: string;
  entityId?: number | string;
}): string | undefined {
  if (approval.sourceItem?.href?.trim()) return approval.sourceItem.href.trim();
  const id = approval.entityId;
  if (id == null || id === '') return undefined;
  const type = String(approval.sourceItem?.entityType ?? approval.entityType ?? '').toLowerCase();
  if (type === 'claim') return `/claims/${id}`;
  if (type === 'user') return `/staff/users/${id}/settings`;
  if (type === 'client_profile' || type === 'client_credit_limit' || type === 'client') {
    return `/clients/${id}`;
  }
  return undefined;
}

export function getApprovalSourceEntityType(approval: Approval): string | undefined {
  return approval.sourceItem?.entityType ?? approval.entityType;
}

export function resolveApprovalAmount(approval: Approval): unknown {
  return (
    approval.amount ??
    approval.sourceRecord?.amount ??
    approval.entityData?.claimAmount ??
    approval.metadata?.claimAmount
  );
}
