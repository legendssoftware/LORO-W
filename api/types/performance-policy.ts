/** Mirrors the server `performance-policy.types.ts` report shapes. Keep both in step. */

export type PolicyStatus = 'meets_all' | 'below_standard' | 'not_measurable';

export type PolicyStandardKey =
  | 'visits'
  | 'calls'
  | 'lead_share'
  | 'new_leads'
  | 'quotations'
  | 'crm_compliance';

export type PolicyQuotaSource = 'current' | 'history' | 'mixed' | 'none';

export type PolicyReportSortKey =
  | 'name'
  | 'activityPct'
  | 'visitsPct'
  | 'callsPct'
  | 'status'
  | 'flaggedVisits'
  | 'expectedDays'
  | 'payPct';

export interface PolicyRangeSummary {
  type: 'today' | 'week' | 'month' | 'custom';
  startYmd: string;
  endYmd: string;
  periodStartYmd: string;
  periodEndYmd: string;
  timeZone: string;
}

export interface PolicyReportUser {
  uid: number;
  clerkUserId: string;
  name: string | null;
  surname: string | null;
  role: string | null;
  workforceType: string | null;
  branchUid: number | null;
  country: string;
  positionKey: string | null;
}

export interface PolicyReportRow {
  user: PolicyReportUser;
  branchUid: number | null;
  country: string;
  expectedDays: number;
  quotaSource: PolicyQuotaSource;
  callsPct: number | null;
  visitsPct: number | null;
  activityPct: number | null;
  allStandardsMet: boolean;
  status: PolicyStatus;
  failedStandards: string[];
  flaggedVisits: number;
  incompleteVisits: number;
  pendingExceptions: number;
  approvedExceptions: number;
  signed: boolean;
  payPct: number | null;
  payAmount: number | null;
  visits: { expected: number | null; verified: number; logged: number };
  calls: { expected: number | null; qualifying: number; logged: number };
  newLeads: number;
  leadSharePct: number | null;
  quotations: number;
  crmCompliancePct: number | null;
  standards: Array<{ key: PolicyStandardKey; met: boolean | null }>;
}

export interface PolicyReportTotals {
  users: number;
  meetingAllStandards: number;
  belowStandard: number;
  notMeasurable: number;
  avgActivityPct: number | null;
  flaggedVisits: number;
  incompleteVisits: number;
  pendingExceptions: number;
  visits: { expected: number; verified: number };
  calls: { expected: number; qualifying: number };
}

export interface PolicyReportResponse {
  range: PolicyRangeSummary;
  policy: { version: string; shadowMode: boolean };
  rows: PolicyReportRow[];
  totals: PolicyReportTotals;
  pagination: { total: number; limit: number; offset: number };
  source: 'live' | 'snapshot';
  finalisedAt: string | null;
}

export interface PolicyReportFinaliseResponse {
  month: string;
  policyVersion: string;
  users: number;
  finalisedAt: string;
}

/** Window selection: a whole month, or a custom from/to (max 92 days). */
export type PolicyWindowParams = { month: string } | { from: string; to: string };

export type PolicyReportParams = PolicyWindowParams & {
  branchUid?: number;
  country?: string;
  search?: string;
  /** Comma-separated Clerk user ids, max 200. */
  userClerkUserIds?: string;
  signed?: boolean;
  status?: PolicyStatus;
  sort?: PolicyReportSortKey;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export interface VerificationQueueItem {
  checkInUid: number;
  ownerClerkUserId: string;
  clientUid: number | null;
  checkInTime: string;
  status: string;
  flags: string[];
  missing: string[];
  suggestedAction?: 'review';
  reason?: string;
}

export interface VerificationQueueResponse {
  count: number;
  truncated: boolean;
  items: VerificationQueueItem[];
}

export interface PolicyAgreement {
  userClerkUserId: string;
  policyVersion: string;
  participates: boolean;
  positionKey: string | null;
  prr: number | null;
  currency: string;
  effectiveDate: string | null;
  signedAt: string | null;
  witnessTypedName: string | null;
  applyCommercialStandards: boolean;
}

export interface PolicyAcknowledgement {
  policyVersion: string;
  required: boolean;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  statements: Array<{ key: string; text: string }>;
  positionKey: string | null;
  minimums: { callsPerDay: number; visitsPerDay: number | null } | null;
}

export interface PolicyDashboardSummary {
  expectedDays: number;
  calls: { expected: number | null; qualifying: number; achievementPct: number | null };
  visits: { expected: number | null; verified: number; achievementPct: number | null };
  leads: { newLeads: number; sharePct: number | null };
  quotations: { count: number };
  crm: { compliancePct: number | null };
  performance: { status: PolicyStatus; activityPct: number | null };
  payHiddenByShadowMode: boolean;
  policy: { shadowMode: boolean };
}

export interface PolicyExceptionItem {
  uid: number;
  userClerkUserId: string;
  type: string;
  incidentDate: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  isLateReport: boolean;
  decision: string | null;
}

export interface CustomerMapPoint {
  clientUid: number;
  name: string;
  latitude: number;
  longitude: number;
  customerType: string | null;
  lastVisitAt: string | null;
  newLead: boolean;
  hasQuotation: boolean;
}

export interface CustomerMapResponse {
  count: number;
  truncated: boolean;
  points: CustomerMapPoint[];
}

export interface MarketIntelStockResponse {
  totals: {
    observations: number;
    customers: number;
    bitdrywallCustomers: number;
    fuseCustomers: number;
    competitorCustomers: number;
  };
  rows: Array<{
    productCategory: string;
    brand: string | null;
    observations: number;
    customers: number;
    bitdrywallObservations: number;
    fuseObservations: number;
    competitorObservations: number;
  }>;
}

export interface WeeklyReviewMetrics {
  expectedDays: number;
  callsExpected: number | null;
  callsActual: number;
  visitsExpected: number | null;
  visitsActual: number;
  newLeads: number;
  quotations: number;
  crmCompliancePct: number | null;
  status: string;
}

export interface WeeklyReview {
  uid: number;
  userClerkUserId: string;
  weekStart: string;
  weekEnd: string;
  metrics: WeeklyReviewMetrics;
  reason: string | null;
  employeeComments: string | null;
  managerComments: string | null;
  supportRequired: string | null;
  requiredImprovement: string | null;
  nextReviewDate: string | null;
  employeeTypedName: string | null;
  employeeSignedAt: string | null;
  managerTypedName: string | null;
  managerSignedAt: string | null;
  caseUid: number | null;
}

export type PerformanceCaseStage =
  | 'weekly_review'
  | 'coaching'
  | 'pip'
  | 'formal_review'
  | 'further_action'
  | 'closed';

export interface PerformanceCaseRecord {
  uid: number;
  userClerkUserId: string;
  stage: PerformanceCaseStage;
  pip: {
    requiredStandards: string;
    gaps: string;
    support: string;
    improvementRequired: string;
    measurement: string;
    reviewDates: string;
    requiredOutcome: string;
  } | null;
  closedAt: string | null;
}
