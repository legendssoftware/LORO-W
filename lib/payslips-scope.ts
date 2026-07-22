/**
 * Payslip list access scope — mirrors server PayslipsController.getAccessScope elevated roles.
 */

const PAYSLIPS_ELEVATED_LEVELS = new Set<string>([
  'admin',
  'owner',
  'manager',
  'developer',
  'support',
]);

function normalize(accessLevel: string | undefined): string {
  if (accessLevel == null || accessLevel === '') return '';
  return accessLevel.toLowerCase().trim();
}

/** True when the user may list org-wide payslips and filter by employee. */
export function canViewOrgPayslips(
  accessLevel: string | undefined,
  role?: string | undefined
): boolean {
  const level = normalize(accessLevel) || normalize(role);
  if (!level) return false;
  return PAYSLIPS_ELEVATED_LEVELS.has(level);
}

export const PAYSLIP_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'GENERATED', label: 'Generated' },
  { value: 'SENT', label: 'Sent' },
  { value: 'VIEWED', label: 'Viewed' },
] as const;
