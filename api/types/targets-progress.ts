export type TargetsProgressBucket = 'day' | 'hour' | 'week' | 'fortnight' | 'month';

export interface TargetsProgressBucketRow {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  targetCalls: number;
  achievedCalls: number;
  targetVisits: number;
  achievedVisits: number;
  targetLeads: number;
  achievedLeads: number;
  /** All check-ins in bucket (any method) for reporting cohort — from targets-progress API. */
  achievedCheckInsAllTypes: number;
  cumulativeTargetCalls: number;
  cumulativeAchievedCalls: number;
  cumulativeTargetVisits: number;
  cumulativeAchievedVisits: number;
  cumulativeTargetLeads: number;
  cumulativeAchievedLeads: number;
  checkInsByMethod?: Record<string, number>;
  leadsBySource?: Record<string, number>;
}

export interface TargetsProgressUserSummary {
  uid: number;
  clerkUserId: string;
  name: string;
  surname: string;
  photoURL?: string | null;
  branchUid?: number | null;
  workforceType?: string | null;
  hasTarget: boolean;
  periodTargetCalls: number;
  periodTargetVisits: number;
  periodTargetLeads: number;
  achievedCallsInRange: number;
  achievedVisitsInRange: number;
  achievedLeadsInRange: number;
  cumulativeTargetCallsEnd: number;
  cumulativeTargetVisitsEnd: number;
  cumulativeTargetLeadsEnd: number;
  belowCumulativeCalls: boolean;
  belowCumulativeVisits: boolean;
  belowCumulativeLeads: boolean;
  shortfallCalls: number;
  shortfallVisits: number;
  shortfallLeads: number;
}

export interface TargetsProgressData {
  aggregateBuckets: TargetsProgressBucketRow[];
  users: TargetsProgressUserSummary[];
  orgClerkId: string;
  from: string;
  to: string;
  bucket: TargetsProgressBucket;
}
