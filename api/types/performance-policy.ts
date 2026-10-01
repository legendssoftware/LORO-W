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
  sort?: PolicyReportSortKey;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};
