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
    id: 'system',
    label: 'System & technical',
    types: [
      { value: 'system_change', label: 'System change' },
      { value: 'data_export', label: 'Data export' },
      { value: 'integration_request', label: 'Integration request' },
      { value: 'software_upgrade', label: 'Software upgrade' },
      { value: 'infrastructure_change', label: 'Infrastructure change' },
      { value: 'security_policy_change', label: 'Security policy change' },
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare & medical',
    types: [
      { value: 'medical_leave', label: 'Medical leave' },
      { value: 'insurance_claim', label: 'Insurance claim' },
      { value: 'medical_procedure', label: 'Medical procedure' },
    ],
  },
  {
    id: 'education',
    label: 'Education & training',
    types: [
      { value: 'course_approval', label: 'Course approval' },
      { value: 'certification_request', label: 'Certification request' },
      { value: 'education_leave', label: 'Education leave' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance & legal',
    types: [
      { value: 'compliance_report', label: 'Compliance report' },
      { value: 'legal_document', label: 'Legal document' },
      { value: 'audit_request', label: 'Audit request' },
      { value: 'risk_assessment', label: 'Risk assessment' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects & initiatives',
    types: [
      { value: 'project_initiation', label: 'Project initiation' },
      { value: 'project_change', label: 'Project change' },
      { value: 'initiative_request', label: 'Initiative request' },
    ],
  },
  {
    id: 'banking',
    label: 'Financial & banking',
    types: [
      { value: 'loan_request', label: 'Loan request' },
      { value: 'investment_request', label: 'Investment request' },
      { value: 'tax_filing', label: 'Tax filing' },
    ],
  },
  {
    id: 'facilities',
    label: 'Construction & facilities',
    types: [
      { value: 'construction_request', label: 'Construction request' },
      { value: 'space_allocation', label: 'Space allocation' },
    ],
  },
  {
    id: 'supply_chain',
    label: 'Supply chain & procurement',
    types: [
      { value: 'supplier_evaluation', label: 'Supplier evaluation' },
      { value: 'inventory_adjustment', label: 'Inventory adjustment' },
      { value: 'quality_control', label: 'Quality control' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing & creative',
    types: [
      { value: 'marketing_campaign', label: 'Marketing campaign' },
      { value: 'brand_approval', label: 'Brand approval' },
      { value: 'content_approval', label: 'Content approval' },
    ],
  },
  {
    id: 'research',
    label: 'Research & development',
    types: [
      { value: 'research_project', label: 'Research project' },
      { value: 'product_development', label: 'Product development' },
      { value: 'innovation_request', label: 'Innovation request' },
    ],
  },
  {
    id: 'environment',
    label: 'Environmental & sustainability',
    types: [
      { value: 'environmental_impact', label: 'Environmental impact' },
      { value: 'sustainability_initiative', label: 'Sustainability initiative' },
      { value: 'waste_management', label: 'Waste management' },
    ],
  },
  {
    id: 'events',
    label: 'Events & entertainment',
    types: [
      { value: 'event_request', label: 'Event request' },
      { value: 'entertainment_request', label: 'Entertainment request' },
      { value: 'sponsorship_request', label: 'Sponsorship request' },
    ],
  },
  {
    id: 'awards',
    label: 'Awards & recognition',
    types: [
      { value: 'award_nomination', label: 'Award nomination' },
      { value: 'recognition_request', label: 'Recognition request' },
    ],
  },
  {
    id: 'emergency',
    label: 'Emergency & security',
    types: [
      { value: 'emergency_procedure', label: 'Emergency procedure' },
      { value: 'security_incident', label: 'Security incident' },
      { value: 'crisis_management', label: 'Crisis management' },
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
