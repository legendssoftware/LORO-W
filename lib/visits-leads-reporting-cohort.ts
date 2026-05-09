/**
 * Visits/leads reporting cohort: Internal Sales and External Sales roles only (case-insensitive).
 * Align with server `src/lib/visits-leads-reporting-cohort.util.ts`.
 */
export const VISITS_LEADS_REPORTING_ROLE_LABELS = [
  'Internal Sales',
  'External Sales',
] as const;

const NORMALIZED_REP_ROLES = new Set(
  VISITS_LEADS_REPORTING_ROLE_LABELS.map((r) => r.trim().toLowerCase()),
);

export function isVisitsLeadsReportingSalesRepRole(
  role: string | null | undefined,
): boolean {
  if (role == null || typeof role !== 'string') return false;
  return NORMALIZED_REP_ROLES.has(role.trim().toLowerCase());
}
