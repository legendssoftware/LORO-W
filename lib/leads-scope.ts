import { AccessLevel } from '@/api/types/user';
import type { LeadEntryTypeApi } from '@/api/types/leads';

/** UI filter value for entry type (includes "all"). */
export type LeadEntryTypeFilter = 'all' | LeadEntryTypeApi;

export const LEAD_ENTRY_TYPE_FILTER_OPTIONS: ReadonlyArray<{
  value: LeadEntryTypeFilter;
  label: string;
}> = [
  { value: 'all', label: 'All origins' },
  { value: 'manual', label: 'User created' },
  { value: 'import', label: 'Imported' },
] as const;

/** Maps UI filter to GET /leads `entryType` query param. */
export function leadEntryTypeToApiParam(
  filter: LeadEntryTypeFilter | string | undefined | null
): LeadEntryTypeApi | undefined {
  if (filter == null || filter === '' || filter === 'all') return undefined;
  if (filter === 'manual' || filter === 'import') return filter;
  return undefined;
}

/** Matches server: org-wide `scope=all` is allowed only for admin or owner. */
export function canViewAllOrgLeads(accessLevel: string | undefined | null): boolean {
  if (accessLevel == null || typeof accessLevel !== 'string') return false;
  const n = accessLevel.toLowerCase();
  return n === AccessLevel.ADMIN || n === AccessLevel.OWNER;
}

/** Matches POST /leads/dedupe role gate: admin, manager, support, developer, owner. */
export function canDedupeOrgLeads(
  accessLevel: string | undefined | null,
  role?: string | undefined | null
): boolean {
  const raw = accessLevel ?? role;
  if (raw == null || typeof raw !== 'string') return false;
  const n = raw.toLowerCase();
  return (
    n === AccessLevel.ADMIN ||
    n === AccessLevel.OWNER ||
    n === AccessLevel.MANAGER ||
    n === AccessLevel.SUPPORT ||
    n === AccessLevel.DEVELOPER
  );
}
