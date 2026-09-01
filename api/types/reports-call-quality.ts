export type CallQualityRepRow = {
  ownerClerkUserId: string;
  ownerName: string | null;
  ownerExtension: string | null;
  isUnlinked: boolean;
  callCount: number;
  avgScore: number | null;
  missedQuestionsCount: number;
  leadsLinked: number;
  quotationsCount: number;
  conversionRate: number | null;
  coachingRecommendations: string[];
};

export type CallQualityMissedQuestion = {
  metricId: string;
  label: string;
  missedCount: number;
};

export type CallQualityReviewCall = {
  uid: string;
  ownerName: string | null;
  startedAt: string | null;
  scoreOverall: number | null;
  reasons: string[];
};

export type CallQualityScoreByDimension = {
  dimension: string;
  avgScore: number;
  callCount: number;
};

export type CallQualityReportResponse = {
  avgScoreOverall: number | null;
  totalCalls: number;
  callsVsDailyTarget: number;
  dailyCallTarget: number;
  conversionRate: number | null;
  unlinkedCallCount: number;
  scoreByDimension: CallQualityScoreByDimension[];
  reps: CallQualityRepRow[];
  missedQuestions: CallQualityMissedQuestion[];
  callsNeedingReview: CallQualityReviewCall[];
};

export type CallQualityReportParams = {
  from?: string;
  to?: string;
};
