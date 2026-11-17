export interface LeadActivityReportParams {
  from: string;
  to: string;
  branchId?: number;
  userUid?: number;
}

export interface LeadActivityCounts {
  total: number;
  touched: number;
  untouched: number;
  deleted: number;
  discarded: number;
  declined: number;
  cancelled: number;
  converted: number;
  approved: number;
  review: number;
  pendingTouched: number;
}

export interface LeadActivityUserRow {
  userId: number;
  name: string;
  lifetime: LeadActivityCounts;
  period: LeadActivityCounts;
}

export interface LeadActivityReportResponse {
  from: string;
  to: string;
  lifetime: LeadActivityCounts;
  period: LeadActivityCounts;
  users: LeadActivityUserRow[];
}
