import type { PolicyStandardKey, PolicyStatus } from '@/api/types/performance-policy';

export const POLICY_STATUS_LABEL: Record<PolicyStatus, string> = {
  meets_all: 'Meets standards',
  below_standard: 'Below standard',
  not_measurable: 'Not measurable',
};

export const POLICY_STANDARD_LABEL: Record<PolicyStandardKey, string> = {
  visits: 'Visits',
  calls: 'Calls',
  lead_share: 'Lead share',
  new_leads: 'New leads',
  quotations: 'Quotations',
  crm_compliance: 'CRM',
};

export function policyStatusLabel(status: PolicyStatus): string {
  switch (status) {
    case 'meets_all':
    case 'below_standard':
    case 'not_measurable':
      return POLICY_STATUS_LABEL[status];
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

/** Fraction (0.9) to "90%"; null/undefined to an em dash. */
export function formatPolicyPct(fraction: number | null | undefined): string {
  if (fraction == null || !Number.isFinite(fraction)) return '—';
  return `${Math.round(fraction * 100)}%`;
}

export function formatPolicyCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString();
}

/** "36 / 40" style actual-over-expected; expected may be unknown. */
export function formatActualOfExpected(actual: number, expected: number | null): string {
  return `${formatPolicyCount(actual)} / ${expected == null ? '—' : formatPolicyCount(expected)}`;
}

/** Download text as a file in the browser. */
export function downloadTextFile(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
