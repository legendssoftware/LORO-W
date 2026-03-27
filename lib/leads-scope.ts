import { AccessLevel } from '@/api/types/user';

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
