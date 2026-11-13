/**
 * Pipeline list/report scope vs server behaviour (leads report + check-ins).
 * Keep aligned with resolveReportsScopeForUser.
 */

import { getReportsDataScope, type ReportsTeamAssignments } from '@/lib/access';

/** Organisation-wide pipeline data. Admin and owner, or other org roles with no team. */
export function isPipelineLeadsOrgWide(
  accessLevel: string | undefined,
  assignments?: ReportsTeamAssignments | null,
): boolean {
  return getReportsDataScope(accessLevel, assignments) === 'org';
}

/** Same rule as leads. A team viewer must not request the whole organisation's visits. */
export function isPipelineVisitsOrgWide(
  accessLevel: string | undefined,
  assignments?: ReportsTeamAssignments | null,
): boolean {
  return getReportsDataScope(accessLevel, assignments) === 'org';
}

export function getPipelinePageSubtitle(
  accessLevel: string | undefined,
  assignments?: ReportsTeamAssignments | null,
): string {
  const scope = getReportsDataScope(accessLevel, assignments);
  if (scope === 'org') {
    return 'Organisation pipeline for the selected period.';
  }
  if (scope === 'team') {
    return 'Targets, leads, and visits for your team.';
  }
  return 'Targets, leads, and visits for your period—scoped to you.';
}
