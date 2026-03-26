import { AccessLevel } from '@/api/types/user';

/** Matches server: org-wide `scope=all` is allowed only for admin or owner. */
export function canViewAllOrgLeads(accessLevel: string | undefined | null): boolean {
  if (accessLevel == null || typeof accessLevel !== 'string') return false;
  const n = accessLevel.toLowerCase();
  return n === AccessLevel.ADMIN || n === AccessLevel.OWNER;
}
