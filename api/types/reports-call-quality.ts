export type CallQualityRepRow = {
  ownerClerkUserId: string;
  ownerName: string | null;
  ownerExtension: string | null;
  isUnlinked: boolean;
  callCount: number;
  decisionMakersReached: number;
  qualityConversations: number;
  opportunitiesFound: number;
  boqsRequested: number;
  followUpsBooked: number;
  qualityConversationRate: number | null;
  avgScore: number | null;
  missedQuestionsCount: number;
  missedOpportunitiesCount: number;
  leadsLinked: number;
  quotationsCount: number;
  ordersConverted: number;
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
  label: string;
  avgScore: number;
  callCount: number;
};

export type CallQualityScoreDistribution = {
  excellent: number;
  good: number;
  needsImprovement: number;
  poor: number;
  totalScored: number;
};

export type CallQualityFunnel = {
  callsMade: number;
  decisionMakersReached: number;
  qualityConversations: number;
  immediateOpportunitiesFound: number;
  projectsIdentified: number;
  boqsRequested: number;
  quotesGenerated: number;
  followUpsBooked: number;
  ordersConverted: number;
  missedOpportunities: number;
};

export type CallQualityReportResponse = {
  avgScoreOverall: number | null;
  totalCalls: number;
  callsVsDailyTarget: number;
  dailyCallTarget: number;
  conversionRate: number | null;
  qualityConversationRate: number | null;
  missedOpportunitiesCount: number;
  unlinkedCallCount: number;
  funnel: CallQualityFunnel;
  scoreByDimension: CallQualityScoreByDimension[];
  scoreDistribution: CallQualityScoreDistribution;
  reps: CallQualityRepRow[];
  missedQuestions: CallQualityMissedQuestion[];
  callsNeedingReview: CallQualityReviewCall[];
};

export type CallQualityReportParams = {
  from?: string;
  to?: string;
  branchId?: number;
  userUid?: number;
};
