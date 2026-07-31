/**
 * Payslip list access scope — all users see only their own payslips.
 */

export const PAYSLIP_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'GENERATED', label: 'Generated' },
  { value: 'SENT', label: 'Sent' },
  { value: 'VIEWED', label: 'Viewed' },
] as const;

/** Always false — org-wide payslip listing is not exposed in the web app. */
export function canViewOrgPayslips(
  _accessLevel?: string,
  _role?: string,
): boolean {
  return false;
}
