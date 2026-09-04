export type CallQualityRepRow = {
  ownerClerkUserId: string;
  ownerName: string | null;
  ownerExtension: string | null;
  isUnlinked: boolean;
  branchUid: number | null;
  branchName: string | null;
  callCount: number;
  decisionMakersReached: number;
  qualityConversations: number;
  opportunitiesFound: number;
  boqsRequested: number;
  followUpsBooked: number;
  qualityConversationRate: number | null;
  avgScore: number | null;
  avgDurationSeconds: number | null;
  greetingPassRate: number | null;
  etiquettePassRate: number | null;
  missedQuestionsCount: number;
  missedOpportunitiesCount: number;
  leadsLinked: number;
  quotationsCount: number;
  ordersConverted: number;
  conversionRate: number | null;
  coachingRecommendations: string[];
};

export type CallQualityBranchRow = {
  branchUid: number | null;
  branchName: string;
  callCount: number;
  decisionMakersReached: number;
  qualityConversations: number;
  opportunitiesFound: number;
  missedOpportunitiesCount: number;
  qualityConversationRate: number | null;
  avgScore: number | null;
  avgDurationSeconds: number | null;
  greetingPassRate: number | null;
};

export type CallQualityMissedQuestion = {
  metricId: string;
  label: string;
  missedCount: number;
};

export type CallQualityBooleanChip = {
  id: string;
  label: string;
  value: boolean;
};

export type CallQualityReviewCall = {
  uid: string;
  ownerName: string | null;
  ownerExtension: string | null;
  branchName: string | null;
  startedAt: string | null;
  scoreOverall: number | null;
  durationSeconds: number | null;
  origin: string | null;
  fromLabel: string | null;
  toLabel: string | null;
  clientUid: number | null;
  leadUid: number | null;
  transcriptStatus: string | null;
  reasons: string[];
  outcomeChips: CallQualityBooleanChip[];
};

export type CallQualityScoreByDimension = {
  dimension: string;
  label: string;
  avgScore: number;
  callCount: number;
  category: string;
  affectsScore: boolean;
  passCount: number;
  failCount: number;
};

export type CallQualityBehaviourRow = {
  id: string;
  label: string;
  passCount: number;
  failCount: number;
  avgScore: number | null;
  passRate: number | null;
};

export type CallQualityArchetypeStat = {
  id: string;
  label: string;
  count: number;
  sharePct: number | null;
  avgDurationSeconds: number | null;
  medianDurationSeconds: number | null;
};

export type CallQualityTypicalCall = {
  archetype: string | null;
  label: string | null;
  sharePct: number | null;
  medianDurationSeconds: number | null;
  greetingPassRate: number | null;
  etiquettePassRate: number | null;
  sentence: string;
};

export type CallQualityDurationBucket = {
  id: string;
  label: string;
  count: number;
};

export type CallQualityDurationSummary = {
  avgDurationSeconds: number | null;
  medianDurationSeconds: number | null;
  qualityConversationMedianSeconds: number | null;
  buckets: CallQualityDurationBucket[];
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

export type CallQualitySources = {
  from: string;
  to: string;
  scorecardVersion: number;
  productName: string;
  reviewScoreThreshold: number;
  caption: string;
  origin: {
    company_phone: number;
    in_app: number;
    personal_mobile: number;
  };
  transcript: {
    ready: number;
    pending: number;
    failed: number;
  };
  unlinkedCallCount: number;
  leadsLinked: number;
  clientsLinked: number;
  visitsLinked: number;
};

export type CallQualityDailyPoint = {
  date: string;
  calls: number;
  qualityConversations: number;
  avgScore: number | null;
  avgDurationSeconds: number | null;
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
  avgDurationSeconds: number | null;
  medianDurationSeconds: number | null;
  greetingPassRate: number | null;
  etiquettePassRate: number | null;
  funnel: CallQualityFunnel;
  scoreByDimension: CallQualityScoreByDimension[];
  scoreDistribution: CallQualityScoreDistribution;
  reps: CallQualityRepRow[];
  missedQuestions: CallQualityMissedQuestion[];
  callsNeedingReview: CallQualityReviewCall[];
  sources: CallQualitySources;
  typicalCall: CallQualityTypicalCall;
  archetypes: CallQualityArchetypeStat[];
  duration: CallQualityDurationSummary;
  behaviour: CallQualityBehaviourRow[];
  branches: CallQualityBranchRow[];
  daily: CallQualityDailyPoint[];
};

export type CallQualityReportParams = {
  from?: string;
  to?: string;
  branchId?: number;
  userUid?: number;
};
