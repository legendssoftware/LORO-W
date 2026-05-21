import type {
  ClientProfileData,
  ClientProject,
  ClientQuotation,
} from '@/api/types/client-portal';

export function formatProjectLabel(value?: string | null): string {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function projectStatusClass(status?: string): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'completed') return 'bg-green-100 text-green-800';
  if (s === 'in_progress' || s === 'approved') return 'bg-blue-100 text-blue-800';
  if (s === 'on_hold' || s === 'delayed') return 'bg-amber-100 text-amber-800';
  if (s === 'cancelled') return 'bg-red-100 text-red-800';
  return 'bg-muted text-muted-foreground';
}

export function projectPriorityClass(priority?: string): string {
  const p = (priority ?? '').toLowerCase();
  if (p === 'critical' || p === 'urgent') return 'bg-red-100 text-red-800';
  if (p === 'high') return 'bg-amber-100 text-amber-800';
  if (p === 'medium') return 'bg-blue-50 text-blue-800';
  return 'bg-muted text-muted-foreground';
}

function toNumber(value?: number | null): number | null {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(value);
}

/** True when budget > 0 and spent or total cost exceeds budget. */
export function isProjectOverBudget(project: Pick<ClientProject, 'budget' | 'currentSpent' | 'totalCost'>): boolean {
  const budget = toNumber(project.budget);
  if (budget == null || budget <= 0) return false;

  const spent = toNumber(project.currentSpent);
  const totalCost = toNumber(project.totalCost);

  return (spent != null && spent > budget) || (totalCost != null && totalCost > budget);
}

/** Whether a budget indicator can be shown (budget is set and > 0). */
export function hasProjectBudget(project: Pick<ClientProject, 'budget'>): boolean {
  const budget = toNumber(project.budget);
  return budget != null && budget > 0;
}

export function formatProjectAddress(
  address?: ClientProject['address'] | null
): string {
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

/** Quotations linked to a project (from project payload or client profile). */
export function getProjectQuotations(
  project: ClientProject,
  client?: ClientProfileData
): ClientQuotation[] {
  const embedded = (project.quotations ?? []) as ClientQuotation[];
  if (embedded.length > 0) return embedded;

  if (!client?.quotations) return [];

  const projectUid = project.uid;
  return (client.quotations as ClientQuotation[]).filter((q) => {
    if (q.projectUid === projectUid) return true;
    if (q.project?.uid === projectUid) return true;
    return false;
  });
}

/** Converted quotations / orders tied to the project. */
export function getProjectSales(
  quotations: ClientQuotation[]
): ClientQuotation[] {
  return quotations.filter(
    (q) =>
      q.isConverted === true ||
      (Array.isArray(q.orders) && q.orders.length > 0) ||
      Boolean(q.orderNumber)
  );
}
