import { formatEnumLabel } from '@/lib/format-enum-label';

export type ApprovalTypeGroup = {
  id: string;
  label: string;
  types: { value: string; label: string }[];
};

const COMMON_TYPES = [
  { value: 'leave_request', label: 'Leave request' },
  { value: 'expense_claim', label: 'Expense claim' },
  { value: 'user_access', label: 'Employee access' },
  { value: 'credit_limit', label: 'Credit limit' },
] as const;

const REST_GROUPS: ApprovalTypeGroup[] = [
  {
    id: 'hr',
    label: 'HR & employee',
    types: [
      { value: 'overtime', label: 'Overtime' },
      { value: 'reimbursement', label: 'Reimbursement' },
      { value: 'travel_request', label: 'Travel request' },
      { value: 'role_change', label: 'Role change' },
      { value: 'department_transfer', label: 'Department transfer' },
      { value: 'salary_adjustment', label: 'Salary adjustment' },
      { value: 'recruitment_request', label: 'Recruitment request' },
      { value: 'training_request', label: 'Training request' },
      { value: 'performance_review', label: 'Performance review' },
    ],
  },
  {
    id: 'financial',
    label: 'Document & financial',
    types: [
      { value: 'invoice', label: 'Invoice' },
      { value: 'quotation', label: 'Quotation' },
      { value: 'contract', label: 'Contract' },
      { value: 'report', label: 'Report' },
      { value: 'proposal', label: 'Proposal' },
      { value: 'policy', label: 'Policy' },
      { value: 'budget_request', label: 'Budget request' },
      { value: 'purchase_order', label: 'Purchase order' },
      { value: 'financial_report', label: 'Financial report' },
    ],
  },
  {
    id: 'client',
    label: 'Client & sales',
    types: [
      { value: 'client_registration', label: 'Client registration' },
      { value: 'client_profile_update', label: 'Client profile update' },
      { value: 'discount_request', label: 'Discount request' },
      { value: 'payment_terms', label: 'Payment terms' },
      { value: 'price_change', label: 'Price change' },
      { value: 'sales_target_adjustment', label: 'Sales target adjustment' },
    ],
  },
  {
    id: 'access',
    label: 'User & access',
    types: [
      { value: 'password_reset', label: 'Password reset' },
      { value: 'system_access', label: 'System access' },
      { value: 'data_access', label: 'Data access' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    types: [
      { value: 'asset_assignment', label: 'Asset assignment' },
      { value: 'asset_transfer', label: 'Asset transfer' },
      { value: 'facility_request', label: 'Facility request' },
      { value: 'it_request', label: 'IT request' },
      { value: 'security_access', label: 'Security access' },
      { value: 'vendor_registration', label: 'Vendor registration' },
      { value: 'maintenance_request', label: 'Maintenance request' },
    ],
  },
  {
    id: 'other',
    label: 'Other',
    types: [
      { value: 'general', label: 'General' },
      { value: 'other', label: 'Other' },
    ],
  },
];

/** Grouped approval types for staff settings. Common (live) types first. */
export const APPROVAL_TYPE_GROUPS: ApprovalTypeGroup[] = [
  {
    id: 'common',
    label: 'Common',
    types: [...COMMON_TYPES],
  },
  ...REST_GROUPS,
];

const ALL_TYPE_OPTIONS = APPROVAL_TYPE_GROUPS.flatMap((group) => group.types);

/**
 * Human-readable label for a stored approval type value.
 */
export function approvalTypeLabel(value: string): string {
  const match = ALL_TYPE_OPTIONS.find((type) => type.value === value);
  return match?.label ?? formatEnumLabel(value);
}

/**
 * Filter grouped types by a search string.
 */
export function filterApprovalTypeGroups(query: string): ApprovalTypeGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return APPROVAL_TYPE_GROUPS;
  return APPROVAL_TYPE_GROUPS.map((group) => ({
    ...group,
    types: group.types.filter(
      (type) =>
        type.label.toLowerCase().includes(q) ||
        type.value.toLowerCase().includes(q) ||
        group.label.toLowerCase().includes(q),
    ),
  })).filter((group) => group.types.length > 0);
}
