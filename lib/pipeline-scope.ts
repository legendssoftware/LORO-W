/**
 * Pipeline list/report scope vs server behaviour (leads report + check-ins).
 * Keep aligned with LeadsService.getReport / CheckInsService.getAllCheckIns.
 */

function normalizeLevel(accessLevel: string | undefined): string {
  if (accessLevel == null || accessLevel === '') return '';
  return accessLevel.toLowerCase().trim();
}

/** Matches GET /leads/report org-wide scope (admin or owner only). */
export function isPipelineLeadsOrgWide(accessLevel: string | undefined): boolean {
  const n = normalizeLevel(accessLevel);
  return n === 'admin' || n === 'owner';
}

/** Matches check-ins elevated list (omit userUid for org-wide visits). */
export function isPipelineVisitsOrgWide(accessLevel: string | undefined): boolean {
  const n = normalizeLevel(accessLevel);
  return n === 'admin' || n === 'owner' || n === 'manager';
}

export function getPipelinePageSubtitle(accessLevel: string | undefined): string {
  const leadsWide = isPipelineLeadsOrgWide(accessLevel);
  const visitsWide = isPipelineVisitsOrgWide(accessLevel);
  if (leadsWide) {
    return 'Organisation pipeline for the selected period (admin or owner view).';
  }
  if (visitsWide && !leadsWide) {
    return 'Leads scoped to you; visits show the whole organisation for the selected period.';
  }
  return 'Targets, leads, and visits for your period—scoped to you.';
}
